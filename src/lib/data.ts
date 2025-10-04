import type { UrbanZone, Hospital } from './types';
import hospitalsData from './data/hospitals.json';
import urbanZonesData from './data/urban-zones.json';

// This is a simplified data processing function.
// In a real application, you might fetch this data from an API
// and perform more complex calculations.

export async function processData(): Promise<{ zones: UrbanZone[]; hospitals: Hospital[] }> {
  // For now, we are just returning the raw data.
  // The original implementation calculated distances and priority scores,
  // which you can re-implement here if needed.
  
  const hospitals: Hospital[] = hospitalsData;
  const urbanZones: UrbanZone[] = urbanZonesData.map(zone => ({
    ...zone,
    // Add any additional default properties your zones might need
  }));

  return { zones: urbanZones, hospitals };
}
