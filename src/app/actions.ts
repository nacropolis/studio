'use server';

import { recommendNewHospitalLocations } from '@/ai/flows/recommend-new-hospital-locations';
import type { UrbanZone } from '@/lib/types';

export async function getRecommendations(
  zones: UrbanZone[],
  priorityThreshold: number
) {
  try {
    const simplifiedZones = zones.map(zone => ({
      location: zone.name,
      population: zone.population,
      deprivation_index: zone.deprivationIndex,
      // The 'hospital_distance' is a simplification for the AI model
      // In a real scenario, this might be pre-calculated or derived differently
      hospital_distance: zone.distanceToNearestHospital || 0,
    }));

    const input = {
      urbanZoneData: JSON.stringify(simplifiedZones),
      priorityThreshold: priorityThreshold,
    };

    const recommendations = await recommendNewHospitalLocations(input);
    return recommendations;
    
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
}
