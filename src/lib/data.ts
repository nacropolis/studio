import type { UrbanZone, Hospital } from './types';
import { haversineDistance } from './utils';
import hospitalsData from './data/hospitals.json';
import urbanZonesData from './data/urban-zones.json';

const hospitals: Hospital[] = hospitalsData;
const urbanZones: Omit<UrbanZone, 'distanceToNearestHospital' | 'priorityScore' | 'color'>[] = urbanZonesData;

export async function processData(): Promise<{ zones: UrbanZone[]; hospitals: Hospital[] }> {
  const maxPopulation = Math.max(...urbanZones.map(zone => zone.population));
  
  let maxDistance = 0;

  const zonesWithDistances = urbanZones.map(zone => {
    const distances = hospitals.map(hospital => haversineDistance(zone.center, hospital.location));
    const distanceToNearestHospital = Math.min(...distances);
    if (distanceToNearestHospital > maxDistance) {
        maxDistance = distanceToNearestHospital;
    }
    return { ...zone, distanceToNearestHospital };
  });

  const zonesWithScores = zonesWithDistances.map(zone => {
    const populationScore = zone.population / maxPopulation;
    const distanceScore = zone.distanceToNearestHospital / maxDistance;
    const priorityScore = populationScore * zone.deprivationIndex * distanceScore;

    const hue = 120 * (1 - Math.min(priorityScore * 1.5, 1)); // Scale from green (120) to red (0)
    const color = `hsl(${hue}, 90%, 60%)`;

    return { ...zone, priorityScore, color };
  });

  return { zones: zonesWithScores, hospitals };
}
