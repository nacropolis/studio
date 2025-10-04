'use client';

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMap,
} from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import { renderToString } from 'react-dom/server';
import type { Hospital, UrbanZone, Recommendation } from '@/lib/types';
import { HospitalIcon, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

const createHospitalIcon = () => {
  return L.divIcon({
    html: renderToString(
      <div className="p-1 bg-white rounded-full shadow-md">
        <HospitalIcon className="text-blue-600" size={24} />
      </div>
    ),
    className: 'bg-transparent border-0',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

const createRecommendationIcon = () => {
  return L.divIcon({
    html: renderToString(
      <MapPin
        className="text-yellow-500"
        size={36}
        fill="hsl(48, 96%, 53%)"
        strokeWidth={1.5}
        stroke="hsl(var(--accent-foreground))"
      />
    ),
    className: 'bg-transparent border-0',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });
};

const Polygons = ({
  zones,
  showZones,
}: {
  zones: UrbanZone[];
  showZones: boolean;
}) => {
  const map = useMap();
  if (!showZones) return null;

  return (
    <>
      {zones.map((zone) => (
        <Polygon
          key={zone.id}
          positions={
            zone.bounds.map((b) => [b.lat, b.lng]) as LatLngExpression[]
          }
          pathOptions={{ color: zone.color, fillOpacity: 0.35, weight: 2 }}
        />
      ))}
    </>
  );
};

type MapViewProps = {
  zones: UrbanZone[];
  hospitals: Hospital[];
  recommendations: Recommendation[];
  showHospitals: boolean;
  showZones: boolean;
};

export function MapView({
  zones,
  hospitals,
  recommendations,
  showHospitals,
  showZones,
}: MapViewProps) {
  const [isMounted, setIsMounted] = useState(false);
  const hospitalIcon = createHospitalIcon();
  const recommendationIcon = createRecommendationIcon();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div id="map-placeholder" className="w-full h-full bg-muted animate-pulse" />
    );
  }

  return (
    <MapContainer
      center={[20.659698, -103.349609]} // Guadalajara
      zoom={12}
      scrollWheelZoom={true}
      className="w-full h-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {showHospitals &&
        hospitals.map((hospital) => (
          <Marker
            key={hospital.id}
            position={[hospital.location.lat, hospital.location.lng]}
            icon={hospitalIcon}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold">{hospital.name}</h3>
                <p>Type: {hospital.type}</p>
                <p>Capacity: {hospital.capacity}</p>
              </div>
            </Popup>
          </Marker>
        ))}

      <Polygons zones={zones} showZones={showZones} />

      {recommendations.map((rec, index) => (
        <Marker
          key={`rec-${index}`}
          position={[rec.center.lat, rec.center.lng]}
          icon={recommendationIcon}
        >
          <Popup>
            <div>
              <h3 className="font-bold">{rec.location}</h3>
              <p>{rec.reason}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
