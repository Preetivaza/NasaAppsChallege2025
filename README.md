# City Insights: Urban Planning Dashboard

This is a Next.js demo project that implements an Urban-Planning Dashboard using Leaflet for map rendering and Tailwind CSS for styling. It showcases how to display map tiles, view AI-driven predictions, and receive urban planning recommendations.

This project is built with Next.js App Router, Server Components, and Genkit for AI flow integration.

## 🎯 Features

- **Interactive Map**: A Leaflet map displaying an OpenStreetMap base layer.
- **GeoJSON Data Overlay**: Renders urban tile data from a local `demo_tiles.json` file.
- **Tile Analysis**: Click on any map tile to open a detailed side panel.
- **AI Recommendations**: The side panel shows AI-generated recommendations for urban planning based on the tile's data, powered by a local Genkit flow.
- **Data Visualization**: Key metrics are visualized using Recharts.
- **Region Aggregation**: A simple tool to draw a rectangle on the map and see aggregated data for the selected tiles.
- **Responsive Design**: The UI adapts to different screen sizes, with the side panel becoming a bottom sheet on mobile.

---

## ⚙️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
- **Mapping**: [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)
- **Charts**: [Recharts](https://recharts.org/)
- **AI Integration**: [Genkit](https://firebase.google.com/docs/genkit)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) version 18.x or higher.
- `pnpm`, `npm`, or `yarn` as a package manager.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd city-insights-dashboard
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running the Development Server

1.  **Start the Next.js app:**
    This command starts the main web application.
    ```bash
    npm run dev
    ```

2.  **Start the Genkit development server (in a separate terminal):**
    This command starts the local AI server that provides recommendations.
    ```bash
    npm run genkit:watch
    ```

3.  **Open your browser:**
    Navigate to [http://localhost:9002](http://localhost:9002) to see the application in action.

---

## 🔧 Configuration

### Environment Variables

The application can be configured via environment variables. Create a `.env.local` file in the root of the project.

**Using Mock AI vs. Real AI Backend**

This project uses Genkit, which runs a local server to simulate an AI backend. The Genkit flow `generateTileRecommendations` is already integrated.

If you were to connect to a real, deployed backend API, you would modify the server action in `src/lib/actions.ts` to make a network request instead of calling the local Genkit flow.

For this demo, ensure the Genkit server is running (`npm run genkit:watch`) for the recommendations feature to work.

### Proxy for Backend

If you were to use a separate backend server, you could configure a proxy in `next.config.ts`. This is useful for avoiding CORS issues during development.

Example `next.config.ts`:
```ts
const nextConfig = {
  // ... other configs
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*', // Proxy to Backend
      },
    ]
  },
};
```
This example proxies requests from `/api` on the frontend to a backend server running on `http://localhost:8000`.

---

## 🧪 Manual End-to-End Test Plan

Follow these steps to verify the core functionality:

1.  **Run the application:**
    - Start the Next.js server: `npm run dev`
    - Start the Genkit server: `npm run genkit:watch`

2.  **Verify Initial Load:**
    - Open [http://localhost:9002](http://localhost:9002).
    - The map should load with the OpenStreetMap base layer.
    - A grid of green/yellow/red tiles (GeoJSON overlay) should be visible on the map.

3.  **Test Tile Interaction:**
    - **Click a tile:** The side panel on the right should open.
    - **Verify Side Panel Content:**
        - The panel should display the `tile_id` and other key metrics.
        - After a brief loading state, AI-generated recommendations should appear.
        - Charts for NDVI and LST should be rendered.

4.  **Test Region Aggregation:**
    - **Click the "Draw Area" button** in the left sidebar.
    - The cursor should change, indicating draw mode is active.
    - **Click and drag on the map** to draw a rectangle over several tiles.
    - An aggregation summary card should appear, showing the combined metrics for all tiles within the rectangle.
    - Click the "Clear Selection" button to remove the rectangle and summary.

5.  **Test Responsiveness:**
    - Open your browser's developer tools and switch to a mobile view (e.g., iPhone 12).
    - The left sidebar should be collapsed.
    - A floating action button (FAB) with a layers icon should be visible.
    - **Click a tile:** The side panel should now appear as a bottom sheet.
    - Close the bottom sheet. The FAB should reappear.

---

## Troubleshooting

- **CORS Issues**: If you connect to an external backend without a proxy, you might encounter CORS errors. Ensure your backend server is configured to allow requests from `http://localhost:9002` or use the proxy method described above.
- **Map Not Loading**: Ensure you have a stable internet connection for the OpenStreetMap tiles to load. If the GeoJSON overlay is missing, check that `public/demo_tiles.json` exists and is correctly formatted.
- **Recommendations Not Loading**: Make sure the Genkit development server is running in a separate terminal via `npm run genkit:watch`. Check the console of that terminal for any errors.
