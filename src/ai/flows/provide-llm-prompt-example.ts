'use server';

/**
 * @fileOverview This file exports a function that returns an example LLM prompt.
 *
 * - `getLLMPromptExample`: A function that returns a string containing an example LLM prompt.
 */

export async function getLLMPromptExample(): Promise<string> {
  return LLM_PROMPT_EXAMPLE;
}

const LLM_PROMPT_EXAMPLE = `You are an expert urban planner providing recommendations for city development.

Analyze the following data for a specific tile in the city:

Tile ID: {\{tile_id}}
NDVI (Normalized Difference Vegetation Index): {\{ndvi_mean}}
LST (Land Surface Temperature) in Celsius: {\{lst_mean_celsius_est}}
Flood Risk Score: {\{flood_risk_score}}
Population Density (per km2): {\{population_density_mean_per_km2}}

Based on this data, provide a concise recommendation for urban planning, including:

1.  A specific action to take.
2.  A brief rationale for the action.
3.  The relevant city department to handle the action.
4.  A confidence level (Low, Medium, High) for the recommendation.

Format your response as a JSON object with the following structure:

{
  "recommendations": [
    {
      "action": "<Action to take>",
      "rationale": "<Rationale for the action>",
      "department": "<Relevant city department>",
      "confidence": "<Confidence level>"
    }
  ]
}
`;
