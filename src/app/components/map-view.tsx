'use client';

import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  Polygon,
  useMap,
} from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';
import type { Hospital, UrbanZone, Recommendation } from '@/lib/types';
import { HospitalIcon, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type MapViewProps = {
  hospitals: Hospital[];
  zones: UrbanZone[];
  recommendations: Recommendation[];
  showHospitals: boolean;
  showZones: boolean;
  showHeatmap: boolean;
};

function HeatmapLayer({ zones, showHeatmap }: { zones: UrbanZone[], showHeatmap: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !showHeatmap) {
      // In a real app, you'd want to clear the heatmap layer here
      return;
    }

    const heatmapData = zones.map(zone => ({
      location: new google.maps.LatLng(zone.center.lat, zone.center.lng),
      weight: zone.population,
    }));

    const heatmap = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: map,
    });
    
    heatmap.set('radius', 50);

    return () => {
      heatmap.setMap(null);
    };
  }, [map, zones, showHeatmap]);

  return null;
}

export function MapView({
  hospitals,
  zones,
  recommendations,
  showHospitals,
  showZones,
  showHeatmap,
}: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <p className="text-destructive">
          Google Maps API Key is missing. Please add it to your .env.local file.
        </p>
      </div>
    );
  }

  const mapId = 'a1290a372e628593';

  return (
    <APIProvider apiKey={apiKey} libraries={['visualization']}>
      <Map
        defaultCenter={{ lat: 34.052235, lng: -118.243683 }}
        defaultZoom={11}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
        mapId={mapId}
        className='w-full h-full'
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
            <div className="p-2">
              <h3 className="font-bold">{selectedHospital.name}</h3>
              <p>Type: {selectedHospital.type}</p>
              <p>Capacity: {selectedHospital.capacity}</p>
            </div>
          </InfoWindow>
        )}
        
        {showZones && zones.map(zone => (
          <Polygon
            key={zone.id}
            paths={zone.bounds}
            strokeColor={zone.color}
            strokeOpacity={0.8}
            strokeWeight={2}
            fillColor={zone.color}
            fillOpacity={0.35}
          />
        ))}

        {showHeatmap && <HeatmapLayer zones={zones} showHeatmap={showHeatmap} />}

        {recommendations.map((rec, index) => (
            <AdvancedMarker key={`rec-${index}`} position={rec.center}>
                <MapPin className="text-accent" size={36} fill="hsl(var(--accent))" strokeWidth={1.5} stroke="hsl(var(--accent-foreground))" />
            </AdvancedMarker>
        ))}
        
      </Map>
    </APIProvider>
  );
}
