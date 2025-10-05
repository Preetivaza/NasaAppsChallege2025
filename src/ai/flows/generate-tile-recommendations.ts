'use server';

/**
 * @fileOverview A Genkit flow that generates urban planning recommendations for a selected map tile using GenAI.
 *
 * - generateTileRecommendations - A function that handles the generation of tile recommendations.
 * - GenerateTileRecommendationsInput - The input type for the generateTileRecommendations function.
 * - GenerateTileRecommendationsOutput - The return type for the generateTileRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTileRecommendationsInputSchema = z.object({
  tile_id: z.string().describe('The ID of the map tile.'),
  ndvi_mean: z.number().describe('The mean Normalized Difference Vegetation Index (NDVI) of the tile.'),
  pct_green: z.number().describe('The percentage of green cover in the tile.'),
  lst_mean_celsius_est: z.number().describe('The estimated mean Land Surface Temperature (LST) in Celsius of the tile.'),
  aod_mean: z.number().describe('The mean Aerosol Optical Depth (AOD) of the tile, an indicator for air quality.'),
  elevation_mean_m: z.number().describe('The mean elevation in meters of the tile.'),
  precip_total_mean_mm: z.number().describe('The total mean precipitation in millimeters of the tile.'),
  water_occurrence_mean: z.number().describe('The mean water occurrence in the tile.'),
  flood_risk_score: z.number().describe('The flood risk score of the tile.'),
  nightlight_index: z.number().describe('The nightlight index of the tile.'),
  population_density_mean_per_km2: z.number().describe('The mean population density per square kilometer of the tile.'),
  greenspace_priority: z.number().describe('The greenspace priority score of the tile.'),
  industrial_suitability: z.number().describe('The industrial suitability score of the tile.'),
  residential_suitability: z.number().describe('The residential suitability score of the tile.'),
  best_use: z.string().describe('The current best use classification of the tile.'),
});
export type GenerateTileRecommendationsInput = z.infer<typeof GenerateTileRecommendationsInputSchema>;

const RecommendationSchema = z.object({
  action: z.string().describe('The recommended action for the tile.'),
  rationale: z.string().describe('The rationale behind the recommendation.'),
  department: z.string().describe('The department responsible for implementing the recommendation.'),
  confidence: z.number().describe('The confidence level (0-1) of the recommendation.'),
});

const GenerateTileRecommendationsOutputSchema = z.object({
  overall_assessment: z.string().describe('A concise, one-paragraph summary of the key findings and overall assessment of the area.'),
  recommendations: z.array(RecommendationSchema).describe('A list of urban planning recommendations for the tile.'),
});
export type GenerateTileRecommendationsOutput = z.infer<typeof GenerateTileRecommendationsOutputSchema>;

export async function generateTileRecommendations(input: GenerateTileRecommendationsInput): Promise<GenerateTileRecommendationsOutput> {
  return generateTileRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTileRecommendationsPrompt',
  input: {schema: GenerateTileRecommendationsInputSchema},
  output: {schema: GenerateTileRecommendationsOutputSchema},
  prompt: `You are an expert urban planner providing recommendations for a specific map tile or area.

  Based on the following data, provide:
  1. An 'overall_assessment': a concise, one-paragraph summary of the key findings.
  2. A list of actionable 'recommendations' to improve urban planning, focusing on green space, temperature, air quality, land surface, and population. Each recommendation must include an action, rationale, responsible department, and confidence level.

  Your advisory MUST be grounded in the data provided.

  Data:
  - ID: {{tile_id}}
  - Green Space (NDVI Mean): {{ndvi_mean}}
  - Green Space (Percentage Green Cover): {{pct_green}}
  - Green Space (Greenspace Priority Score): {{greenspace_priority}}
  - Temperature & Heat (Land Surface Temp °C): {{lst_mean_celsius_est}}
  - Air Quality (Aerosol Optical Depth): {{aod_mean}}
  - Land Surface (Elevation in meters): {{elevation_mean_m}}
  - Land Surface (Water Occurrence): {{water_occurrence_mean}}
  - Land Surface (Flood Risk Score): {{flood_risk_score}}
  - Land Surface (Industrial Suitability): {{industrial_suitability}}
  - Land Surface (Residential Suitability): {{residential_suitability}}
  - Population (Density per km2): {{population_density_mean_per_km2}}
  - Misc (Nightlight Index): {{nightlight_index}}
  - Misc (Total Precipitation mm): {{precip_total_mean_mm}}
  - Misc (Current Best Use): {{best_use}}
  
  Format your response as a JSON object matching the following schema:
  ${JSON.stringify(GenerateTileRecommendationsOutputSchema.shape, null, 2)}`,
});

const generateTileRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateTileRecommendationsFlow',
    inputSchema: GenerateTileRecommendationsInputSchema,
    outputSchema: GenerateTileRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
