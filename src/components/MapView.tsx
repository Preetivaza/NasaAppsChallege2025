"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import "leaflet-draw";

import React, { useEffect, useState, useRef } from "react";
import { useAppContext } from "@/context/AppContext";
import type { TileFeature, TileData } from "@/lib/types";
import { generateMetricsFromMapImage } from "@/ai/flows/generate-metrics-from-map-image";
import { useToast } from "@/hooks/use-toast";

// Fix default icon path (Next.js/Vite)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function MapView() {
  const [tileData, setTileData] = useState<TileData | null>(null);
  const { setSelectedTile, isDrawing, setDrawing, setAggregatedData, cityCoordinates, setClearMapSelection } = useAppContext();
  const { toast } = useToast();
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/demo_tiles.json")
      .then((res) => res.json())
      .then((data) => setTileData(data as TileData))
      .catch(() => setTileData(null));
  }, []);
  
  useEffect(() => {
    if (mapRef.current && cityCoordinates) {
        mapRef.current.setView([cityCoordinates.lat, cityCoordinates.lng], 13);
    }
  }, [cityCoordinates]);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([51.505, -0.09], 13);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    const clearSelection = () => {
        setAggregatedData(null);
        drawnItems.clearLayers();
    };

    setClearMapSelection(() => clearSelection);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [setAggregatedData, setClearMapSelection]);
  
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !drawnItemsRef.current) return;
  
    if (isDrawing) {
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }

      drawControlRef.current = new L.Control.Draw({
        draw: {
          polygon: false, polyline: false, circle: false, marker: false, circlemarker: false,
          rectangle: { shapeOptions: { color: "hsl(var(--accent))", weight: 2, fillOpacity: 0.1 } },
        },
        edit: { featureGroup: drawnItemsRef.current, remove: false, edit: false },
      });
      map.addControl(drawControlRef.current);
  
      const onDrawCreated = async (e: any) => {
        const layer = e.layer;
        const drawnBounds = layer.getBounds();
        
        if (drawnItemsRef.current) {
          drawnItemsRef.current.clearLayers();
          drawnItemsRef.current.addLayer(layer);
        }

        setDrawing(false);
  
        if (geoJsonLayerRef.current) {
          const features: TileFeature[] = [];
          (geoJsonLayerRef.current.getLayers() as L.GeoJSON[]).forEach(layer => {
            if ('feature' in layer && layer.feature) {
                 const feature = (layer as any).feature as TileFeature;
                const featBounds = layer.getBounds();
                if (drawnBounds.intersects(featBounds)) {
                    features.push(feature);
                }
            }
          });
          
          if (features.length > 0) {
            const total = features.length;
            const aggregated = features.reduce(
              (acc, f) => {
                acc.ndvi += f.properties.ndvi_mean ?? 0;
                acc.lst += f.properties.lst_mean_celsius_est ?? 0;
                acc.floodRisk += f.properties.flood_risk_score ?? 0;
                acc.population += f.properties.population_density_mean_per_km2 ?? 0;
                acc.greenspace += f.properties.greenspace_priority ?? 0;
                acc.aod += f.properties.aod_mean ?? 0;
                acc.precipitation += f.properties.precip_total_mean_mm ?? 0;

                return acc;
              },
              { ndvi: 0, lst: 0, floodRisk: 0, population: 0, greenspace: 0, aod: 0, precipitation: 0 }
            );
    
            setAggregatedData({
              count: total,
              avg_ndvi_mean: aggregated.ndvi / total,
              avg_lst_mean_celsius_est: aggregated.lst / total,
              avg_flood_risk_score: aggregated.floodRisk / total,
              total_population_density_mean_per_km2: aggregated.population,
              avg_greenspace_priority: aggregated.greenspace / total,
              avg_aod_mean: aggregated.aod / total,
              avg_precip_total_mean_mm: aggregated.precipitation / total,
            });
          } else {
            // No features found, use AI to generate metrics from image
            setAggregatedData({ count: 0 }); // Show loading state in panel
            try {
              const leafletImage = (await import('leaflet-image')).default;
              leafletImage(map, async (err: any, canvas: HTMLCanvasElement) => {
                if (err) {
                  console.error(err);
                  toast({
                    variant: "destructive",
                    title: "Map Snapshot Failed",
                    description: "Could not capture map image for analysis.",
                  });
                  setAggregatedData(null);
                  return;
                }
                const dataUrl = canvas.toDataURL('image/png');
                const aiMetrics = await generateMetricsFromMapImage({ mapImage: dataUrl });

                setAggregatedData({
                    count: 1, // Treat as a single AI-analyzed area
                    avg_ndvi_mean: aiMetrics.estimated_ndvi_mean,
                    avg_lst_mean_celsius_est: aiMetrics.estimated_lst_mean_celsius,
                    avg_flood_risk_score: 0, // AI doesn't estimate this yet
                    total_population_density_mean_per_km2: aiMetrics.estimated_population_density,
                    avg_greenspace_priority: 0, // AI doesn't estimate this yet
                    avg_aod_mean: 0,
                    avg_precip_total_mean_mm: 0
                });
              });
            } catch (error) {
              console.error("Failed to generate AI metrics:", error);
              toast({
                variant: "destructive",
                title: "AI Analysis Failed",
                description: "Could not generate insights for the selected area.",
              });
              setAggregatedData(null);
            }
          }
        }
      };
      map.on(L.Draw.Event.CREATED, onDrawCreated);
  
      return () => {
        map.off(L.Draw.Event.CREATED, onDrawCreated);
        if (drawControlRef.current) {
            try {
                map.removeControl(drawControlRef.current);
            } catch(e) {
                // ignore, map may already be gone
            }
            drawControlRef.current = null;
        }
      };
    } else {
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
        drawControlRef.current = null;
      }
    }
  }, [isDrawing, setDrawing, setAggregatedData, toast]);


  // Effect for GeoJSON data
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileData) return;

    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
    }
    
    geoJsonLayerRef.current = L.geoJSON(tileData, {
      style: (feature) => {
        if (!feature) return {};
        return {
          fillColor: 'transparent',
          weight: 0,
          opacity: 0,
          color: "transparent",
          fillOpacity: 0,
        } as L.PathOptions;
      },
      onEachFeature: (feature, layer) => {
        layer.on({
          click: () => setSelectedTile(feature as TileFeature),
        });
        const props = feature.properties;
        const tooltipContent = `ID: ${props.tile_id}<br/>NDVI: ${(
          props.ndvi_mean ?? 0
        ).toFixed(2)}<br/>LST: ${(props.lst_mean_celsius_est ?? 0).toFixed(1)}°C`;
        layer.bindTooltip(tooltipContent, { sticky: true });
      }
    }).addTo(map);

  }, [tileData, setSelectedTile]);


  return (
    <>
      <div id="map" ref={mapContainerRef} className="h-full w-full z-10" />
    </>
  );
}
