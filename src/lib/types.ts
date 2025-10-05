import { type Feature, type Polygon } from 'geojson';
import { type GenerateTileRecommendationsOutput as GenkitOutput } from '@/ai/flows/generate-tile-recommendations';

export type GenerateTileRecommendationsOutput = GenkitOutput;

export type TileProperties = {
  tile_id: string;
  ndvi_mean: number;
  pct_green: number;
  lst_mean_celsius_est: number;
  aod_mean: number;
  elevation_mean_m: number;
  precip_total_mean_mm: number;
  water_occurrence_mean: number;
  flood_risk_score: number;
  nightlight_index: number;
  population_density_mean_per_km2: number;
  greenspace_priority: number;
  industrial_suitability: number;
  residential_suitability: number;
  best_use: string;
};

export type TileFeature = Feature<Polygon, TileProperties>;

export type TileData = {
  type: 'FeatureCollection';
  features: TileFeature[];
};

export type Recommendation = GenerateTileRecommendationsOutput['recommendations'][0];

export type AggregatedData = {
  count: number;
  avg_ndvi_mean?: number;
  avg_lst_mean_celsius_est?: number;
  avg_flood_risk_score?: number;
  total_population_density_mean_per_km2?: number;
  avg_greenspace_priority?: number;
  avg_aod_mean?: number;
  avg_precip_total_mean_mm?: number;
};
