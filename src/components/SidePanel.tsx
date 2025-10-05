"use client";

import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppContext } from "@/context/AppContext";
import type { Recommendation, TileProperties, AggregatedData } from "@/lib/types";
import { generateTileRecommendations, GenerateTileRecommendationsInput, GenerateTileRecommendationsOutput } from "@/ai/flows/generate-tile-recommendations";
import ChartsPanel from "./ChartsPanel";
import RecommendationsList from "./RecommendationsList";
import { ScrollArea } from "./ui/scroll-area";
import { BrainCircuit, Users, Building, TreePine, Download, Send, AreaChart, Thermometer, Wind, Droplets } from 'lucide-react';
import { useIsMobile } from "@/hooks/use-mobile";
import FeedbackModal from "./FeedbackModal";
import { Skeleton } from "./ui/skeleton";


const MetricItem = ({ icon: Icon, label, value, unit, description }: { icon: React.ElementType, label: string, value: string | number, unit?: string, description?: string }) => (
    <div className="flex flex-col items-center justify-center rounded-lg bg-muted p-3 text-center" title={description}>
        <Icon className="w-6 h-6 mb-1 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold font-headline">{value}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span></p>
    </div>
);

const getBestUseIcon = (use: string = '') => {
    if (use.toLowerCase().includes('residential')) return Users;
    if (use.toLowerCase().includes('industrial')) return Building;
    if (use.toLowerCase().includes('green')) return TreePine;
    return AreaChart;
}


const transformAggregatedToInput = (aggData: AggregatedData): GenerateTileRecommendationsInput => {
    return {
      tile_id: aggData.count > 1 ? `area with ${aggData.count} tiles` : 'AI Analyzed Area',
      ndvi_mean: aggData.avg_ndvi_mean,
      pct_green: -1, // Not available
      lst_mean_celsius_est: aggData.avg_lst_mean_celsius_est,
      aod_mean: aggData.avg_aod_mean ?? -1,
      elevation_mean_m: -1, // Not available
      precip_total_mean_mm: aggData.avg_precip_total_mean_mm ?? -1,
      water_occurrence_mean: -1, // Not available
      flood_risk_score: aggData.avg_flood_risk_score,
      nightlight_index: -1, // Not available
      population_density_mean_per_km2: aggData.total_population_density_mean_per_km2,
      greenspace_priority: aggData.avg_greenspace_priority,
      industrial_suitability: -1, // Not available
      residential_suitability: -1, // Not available
      best_use: 'Mixed Use Area',
    };
};

export default function SidePanel() {
  const { selectedTile, setSelectedTile, aggregatedData, setAggregatedData, isSidePanelOpen, setSidePanelOpen, clearMapSelection } = useAppContext();
  const [recommendationOutput, setRecommendationOutput] = useState<GenerateTileRecommendationsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();
  const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
  
  const analysisTarget = selectedTile || aggregatedData;
  const analysisType = selectedTile ? 'tile' : (aggregatedData ? 'area' : null);

  useEffect(() => {
    if (analysisTarget) {
      const fetchRecommendations = async () => {
        setIsLoading(true);
        setRecommendationOutput(null);
        
        let inputData: GenerateTileRecommendationsInput | null = null;
        if (analysisType === 'tile' && selectedTile) {
            inputData = selectedTile.properties;
        } else if (analysisType === 'area' && aggregatedData && aggregatedData.count > 0) {
            inputData = transformAggregatedToInput(aggregatedData);
        } else if (analysisType === 'area' && aggregatedData && aggregatedData.count === 0) {
            // This is the loading state for AI analysis from image
        } else {
          setRecommendationOutput(null);
          setIsLoading(false);
          return;
        }

        if (inputData) {
          try {
              const result = await generateTileRecommendations(inputData);
              setRecommendationOutput(result);
          } catch (error) {
            console.error("Failed to fetch recommendations:", error);
            setRecommendationOutput(null);
          } finally {
            setIsLoading(false);
          }
        }
      };
      fetchRecommendations();
    }
  }, [analysisTarget, analysisType, selectedTile, aggregatedData]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedTile(null);
      if (aggregatedData && clearMapSelection) {
        clearMapSelection();
      }
      setAggregatedData(null);
    }
    setSidePanelOpen(open);
  };
  
  if (!analysisTarget) return null;

  let title = '';
  let bestUse = '';
  let properties: Partial<TileProperties & AggregatedData> = {};

  if (analysisType === 'tile' && selectedTile) {
    title = `Tile Analysis: ${selectedTile.properties.tile_id}`;
    bestUse = selectedTile.properties.best_use;
    properties = selectedTile.properties;
  } else if (analysisType === 'area' && aggregatedData && aggregatedData.count > 0) {
    title = aggregatedData.count > 1 ? `Area Analysis (${aggregatedData.count} tiles)` : `AI Area Analysis`;
    bestUse = 'Mixed Use Area';
    properties = {
        ndvi_mean: aggregatedData.avg_ndvi_mean,
        flood_risk_score: aggregatedData.avg_flood_risk_score,
        population_density_mean_per_km2: aggregatedData.total_population_density_mean_per_km2,
        lst_mean_celsius_est: aggregatedData.avg_lst_mean_celsius_est,
        aod_mean: aggregatedData.avg_aod_mean,
        precip_total_mean_mm: aggregatedData.avg_precip_total_mean_mm,
    }
  } else if (analysisType === 'area' && aggregatedData && aggregatedData.count === 0) {
    title = "Analyzing Area with AI...";
    bestUse = "Unknown";
  }


  const BestUseIcon = getBestUseIcon(bestUse);

  return (
    <>
      <Sheet open={isSidePanelOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:w-[480px] flex flex-col p-0" side={isMobile ? "bottom" : "right"}>
          <SheetHeader className="p-6 pb-2">
            <SheetTitle className="flex items-center gap-2 text-xl font-headline">
              <span>{title}</span>
            </SheetTitle>
             <div className="text-sm text-muted-foreground flex items-center gap-2 pt-1">
                <BestUseIcon className="w-4 h-4 text-primary" />
                <Badge variant="outline">{bestUse}</Badge>
            </div>
          </SheetHeader>
          <Separator />
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
                 { (analysisType === 'area' && aggregatedData?.count === 0) ? (
                    <div className="grid grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[93px] w-full" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-4">
                        <MetricItem icon={TreePine} label="Avg. NDVI" value={properties.ndvi_mean?.toFixed(2) ?? 'N/A'} description="Normalized Difference Vegetation Index" />
                        <MetricItem icon={Thermometer} label="Avg. LST" value={properties.lst_mean_celsius_est?.toFixed(1) ?? 'N/A'} unit="°C" description="Land Surface Temperature"/>
                        <MetricItem icon={Users} label="Total Pop." value={Math.round(properties.population_density_mean_per_km2 ?? 0).toLocaleString()} unit="/km²" />
                        <MetricItem icon={Wind} label="Avg. Air Quality" value={properties.aod_mean?.toFixed(2) ?? 'N/A'} description="Aerosol Optical Depth"/>
                        <MetricItem icon={Droplets} label="Avg. Precip" value={properties.precip_total_mean_mm?.toFixed(2) ?? 'N/A'} unit="mm" />
                    </div>
                )}


                <div className="space-y-3">
                    <h3 className="text-lg font-semibold font-headline flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-primary" />
                        AI Advisory
                    </h3>
                    {isLoading && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                        </div>
                    )}
                    {recommendationOutput?.overall_assessment && (
                        <div className="p-4 border rounded-lg bg-muted/50 text-sm text-foreground">
                            <p className="font-semibold mb-2">Overall Assessment</p>
                            <p className="text-muted-foreground">{recommendationOutput.overall_assessment}</p>
                        </div>
                    )}
                </div>
                
                {analysisType === 'tile' && selectedTile && <ChartsPanel properties={selectedTile.properties} />}
                
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold font-headline flex items-center gap-2">
                        Actionable Recommendations
                    </h3>
                    <RecommendationsList recommendations={recommendationOutput?.recommendations || []} isLoading={isLoading} />
                </div>
            </div>
          </ScrollArea>
          <SheetFooter className="p-6 pt-2 bg-background border-t">
             <div className="flex w-full gap-2">
                 <Button variant="outline" className="flex-1" onClick={() => setFeedbackModalOpen(true)}>
                    <Send className="mr-2 h-4 w-4"/>
                    Request Field Survey
                </Button>
                <Button className="flex-1">
                    <Download className="mr-2 h-4 w-4"/>
                    Export JSON
                </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <FeedbackModal isOpen={isFeedbackModalOpen} onOpenChange={setFeedbackModalOpen} />
    </>
  );
}
