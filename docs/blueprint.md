# **App Name**: City Insights Dashboard

## Core Features:

- Map Display: Display interactive map tiles using Leaflet with OpenStreetMap as the base layer.
- GeoJSON Overlay: Overlay GeoJSON features from a local file (`public/demo_tiles.json`) onto the map.
- Tile Prediction: Simulate prediction based on a clicked tile's properties using a mock API endpoint `/api/predict/tile`.
- LLM Recommendation: Generate urban planning recommendations for a tile using mock AI powered by `generateRecommendationWithLLM` for recommendations using `/api/recommendations/tile` and a professional `LLM_PROMPT_EXAMPLE`.
- Side Panel Display: Display key tile metrics and AI powered urban planning recommendations in a collapsible SidePanel using Recharts for chart visualization and data tables. Display recommendations for increasing greenspace where applicable.
- Tile Aggregation: Allow users to draw a rectangle on the map and aggregate metrics from tiles within that rectangle.
- User Feedback: Enable users to provide feedback through a modal form.

## Style Guidelines:

- Primary color: #4CAF50 (Green) for representing nature and urban green spaces. Represents areas where 'increase greenspace' is part of the LLM recommendation tool's consideration.
- Background color: #F0F8F0 (Light Green) to provide a clean and subtle base.
- Accent color: #3F51B5 (Indigo) to highlight interactive elements and important data.
- Headline font: 'Space Grotesk', sans-serif, for headings and important labels, providing a modern tech-focused aesthetic.
- Body font: 'Inter', sans-serif, for readability in data-rich sections and recommendations. Used with 'Space Grotesk'.
- Use a set of consistent icons from Heroicons to represent data metrics and actions.
- Implement a responsive layout using Tailwind CSS grid and flexbox, adapting to different screen sizes and devices, bottom sheet for smaller screens. A floating action button shall toggle panels and the feedback form.