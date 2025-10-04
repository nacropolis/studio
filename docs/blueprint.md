# **App Name**: UrbanBee

## Core Features:

- Hospital Locator: Display existing hospitals (location, capacity, type) on an interactive map using data fetched from a datastore. Each location includes pop-up details.
- Demographic Data Overlay: Overlay urban zones with population and deprivation data on the map. Use color-coded polygons to represent priority scores, from data stored in Firestore.
- Heatmap Visualization: Generate heatmaps based on population density to visualize demand.
- Priority Score Calculation: Calculate a priority score for each zone based on the formula: priority_score = (population / max_population) * marginacion_index * (hospital_distance / max_distance). The results are displayed on the map, color-coded from the lowest score to the highest score.
- Automated Recommendation Tool: The tool will analyze zone data, incorporating population, deprivation index, and hospital distance to suggest new hospital locations, using an LLM to decide when to make recommendations based on a configurable threshold (e.g., priority_score > 0.6).
- Recommendation Display: Display recommendations on the map as markers, including explanatory text (reason), using the reason given by the tool above.
- Distance Calculation: Calculate the distance to the nearest hospital for each zone (Haversine formula).

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to convey trust and stability, reflecting urban planning's serious nature.
- Background color: Light gray (#F0F2F5), a very low saturation version of the primary, to ensure readability and reduce eye strain during map analysis.
- Accent color: Orange (#FF9800) to highlight recommendations and key data points, creating contrast against the blue scheme.
- Body and headline font: 'Inter', a sans-serif font known for its clarity and legibility in UI design.
- Use clear, universally recognized icons for hospitals and other key locations.
- The UI will be a sidebar in the left to select the distinct sections (tools), the map will be in background and in the upper left will be a floating sections with options to customize the tool or configurations available.
- Implement smooth transitions and animations for map interactions.