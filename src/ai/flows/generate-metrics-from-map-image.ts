'use server';

/**
 * @fileOverview A Genkit flow that generates estimated environmental metrics from a map image.
 *
 * - generateMetricsFromMapImage - A function that analyzes a map image and returns estimated metrics.
 * - GenerateMetricsFromMapImageInput - The input type for the function.
 * - GenerateMetricsFromMapImageOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateMetricsFromMapImageInputSchema = z.object({
  mapImage: z.string().describe("A snapshot of a map area as a data URI. It must include a MIME type and use Base64 encoding. Format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateMetricsFromMapImageInput = z.infer<typeof GenerateMetricsFromMapImageInputSchema>;

const GenerateMetricsFromMapImageOutputSchema = z.object({
  estimated_ndvi_mean: z.number().describe('The estimated mean Normalized Difference Vegetation Index (NDVI), from -1 to 1, based on visible greenery.'),
  estimated_lst_mean_celsius: z.number().describe('The estimated mean Land Surface Temperature (LST) in Celsius, considering urban density and vegetation.'),
  estimated_population_density: z.number().describe('The estimated population density (per km^2), based on building types and density.'),
});
export type GenerateMetricsFromMapImageOutput = z.infer<typeof GenerateMetricsFromMapImageOutputSchema>;

export async function generateMetricsFromMapImage(input: GenerateMetricsFromMapImageInput): Promise<GenerateMetricsFromMapImageOutput> {
  return generateMetricsFromMapImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMetricsFromMapImagePrompt',
  input: { schema: GenerateMetricsFromMapImageInputSchema },
  output: { schema: GenerateMetricsFromMapImageOutputSchema },
  prompt: `You are an expert environmental data analyst. Analyze the provided map image and estimate the following metrics for the depicted area.

  Your analysis should be based on visual cues in the image:
  - For NDVI (vegetation index), look at the amount of green space (parks, trees, fields). A dense forest would be close to 1, a barren desert near 0, and a dense city center could be slightly negative.
  - For LST (temperature), consider the density of buildings, presence of dark surfaces like asphalt, and amount of vegetation. Dense urban areas are hotter than vegetated areas.
  - For population density, analyze the types of buildings (residential, commercial, single-family homes, apartments) and their density.

  Image to analyze:
  {{media url=mapImage}}

  Provide your best estimation for the metrics in the required JSON format.`,
});

const generateMetricsFromMapImageFlow = ai.defineFlow(
  {
    name: 'generateMetricsFromMapImageFlow',
    inputSchema: GenerateMetricsFromMapImageInputSchema,
    outputSchema: GenerateMetricsFromMapImageOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
