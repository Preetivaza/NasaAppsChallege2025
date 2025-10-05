import { config } from 'dotenv';
config();

import '@/ai/flows/generate-tile-recommendations.ts';
import '@/ai/flows/provide-llm-prompt-example.ts';
import '@/ai/flows/get-city-coordinates.ts';
import '@/ai/flows/generate-metrics-from-map-image.ts';
