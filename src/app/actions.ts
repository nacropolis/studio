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
      hospital_distance: zone.distanceToNearestHospital,
    }));

    const input = {
      urbanZoneData: JSON.stringify(simplifiedZones),
      priorityThreshold: priorityThreshold,
    };

    const recommendations = await recommendNewHospitalLocations(input);

    const recommendationsWithCoords = recommendations.map(rec => {
        const zone = zones.find(z => z.name === rec.location);
        const center = zone ? { lat: zone.center.lat, lng: zone.center.lng } : { lat: 0, lng: 0 };
        return {
            ...rec,
            center,
        }
    })


    return recommendationsWithCoords;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
}
