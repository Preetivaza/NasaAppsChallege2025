'use server';

/**
 * @fileOverview A Genkit flow that gets the coordinates for a given city name.
 *
 * - getCityCoordinates - A function that returns the latitude and longitude for a city.
 * - GetCityCoordinatesInput - The input type for the getCityCoordinates function.
 * - GetCityCoordinatesOutput - The return type for the getCityCoordinates function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetCityCoordinatesInputSchema = z.object({
  city: z.string().describe('The name of the city to geocode.'),
});
export type GetCityCoordinatesInput = z.infer<typeof GetCityCoordinatesInputSchema>;

const GetCityCoordinatesOutputSchema = z.object({
  latitude: z.number().describe('The latitude of the city.'),
  longitude: z.number().describe('The longitude of the city.'),
});
export type GetCityCoordinatesOutput = z.infer<typeof GetCityCoordinatesOutputSchema>;

export async function getCityCoordinates(input: GetCityCoordinatesInput): Promise<GetCityCoordinatesOutput> {
    return getCityCoordinatesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getCityCoordinatesPrompt',
  input: { schema: GetCityCoordinatesInputSchema },
  output: { schema: GetCityCoordinatesOutputSchema },
  prompt: `Find the geographic coordinates (latitude and longitude) for the following city: {{city}}.`,
});


const getCityCoordinatesFlow = ai.defineFlow(
  {
    name: 'getCityCoordinatesFlow',
    inputSchema: GetCityCoordinatesInputSchema,
    outputSchema: GetCityCoordinatesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
