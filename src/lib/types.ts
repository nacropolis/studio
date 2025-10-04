export type Coordinates = {
  lat: number;
  lng: number;
};

export type Hospital = {
  id: string;
  name: string;
  location: Coordinates;
  capacity: number;
  type: 'General' | 'Specialized' | 'Clinic';
};

export type UrbanZone = {
  id: string;
  name: string;
  population: number;
  deprivationIndex: number; // A score from 0 to 1
  center: Coordinates;
  bounds: Coordinates[];
  // The following were used for map visualization and can be added back
  distanceToNearestHospital?: number;
  priorityScore?: number;
  color?: string;
};

export type Recommendation = {
  location: string;
  reason: string;
};
