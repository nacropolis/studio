'use client';

import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import type { Hospital, UrbanZone, Recommendation, Coordinates } from '@/lib/types';
import { HospitalIcon, MapPin } from 'lucide-react';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;

function Polygons({ zones, showZones }: { zones: UrbanZone[], showZones: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !showZones) return;

    const googlePolygons = zones.map(zone => {
      const polygon = new google.maps.Polygon({
        paths: zone.bounds,
        strokeColor: zone.color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: zone.color,
        fillOpacity: 0.35,
      });
      polygon.setMap(map);
      return polygon;
    });

    return () => {
      googlePolygons.forEach(p => p.setMap(null));
    };
  }, [map, zones, showZones]);

  return null;
}

function Heatmap({ zones, showHeatmap }: { zones: UrbanZone[], showHeatmap: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !showHeatmap) return;

    const heatmapData = zones.map(zone => ({
      location: new google.maps.LatLng(zone.center.lat, zone.center.lng),
      weight: zone.population,
    }));

    const heatmap = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      radius: 50,
    });

    heatmap.setMap(map);

    return () => {
      heatmap.setMap(null);
    };
  }, [map, zones, showHeatmap]);

  return null;
}

type MapViewProps = {
  zones: UrbanZone[];
  hospitals: Hospital[];
  recommendations: Recommendation[];
  showHospitals: boolean;
  showZones: boolean;
  showHeatmap: boolean;
};

export function MapView({
  zones,
  hospitals,
  recommendations,
  showHospitals,
  showZones,
  showHeatmap,
}: MapViewProps) {
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  return (
    <APIProvider apiKey={API_KEY} libraries={['visualization']}>
      <Map
        defaultCenter={{ lat: 20.659698, lng: -103.349609 }} // Guadalajara
        defaultZoom={11}
        mapId="urban_bee_map"
        gestureHandling={'greedy'}
        disableDefaultUI={true}
        className="w-full h-full"
      >
        {showHospitals && hospitals.map(hospital => (
          <AdvancedMarker
            key={hospital.id}
            position={hospital.location}
            onClick={() => setSelectedHospital(hospital)}
          >
            <div className="p-1 bg-white rounded-full shadow-md">
              <HospitalIcon className="text-blue-600" size={24} />
            </div>
          </AdvancedMarker>
        ))}

        {selectedHospital && (
          <InfoWindow
            position={selectedHospital.location}
            onCloseClick={() => setSelectedHospital(null)}
          >
            <div className="p-1">
              <h3 className="font-bold">{selectedHospital.name}</h3>
              <p>Type: {selectedHospital.type}</p>
              <p>Capacity: {selectedHospital.capacity}</p>
            </div>
          </InfoWindow>
        )}

        <Polygons zones={zones} showZones={showZones} />
        <Heatmap zones={zones} showHeatmap={showHeatmap} />

        {recommendations.map((rec, index) => (
           <AdvancedMarker key={`rec-${index}`} position={rec.center}>
             <MapPin className="text-yellow-500" size={36} fill="hsl(48, 96%, 53%)" strokeWidth={1.5} stroke="hsl(var(--accent-foreground))" />
           </AdvancedMarker>
        ))}

      </Map>
    </APIProvider>
  );
}

    