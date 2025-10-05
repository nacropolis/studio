'use client';

import { useState, useEffect } from 'react';
import type { Recommendation, UrbanZone, Hospital } from '@/lib/types';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { getRecommendations } from '@/app/actions';
import dynamic from 'next/dynamic';

// Importación dinámica del mapa para evitar SSR
const MapPlaceholder = dynamic(() => import('./map-view').then(mod => mod.MapPlaceholder), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
      <p className="text-xl font-semibold">Cargando mapa...</p>
    </div>
  )
});

type UrbanBeeClientProps = {
  initialZones: UrbanZone[];
  initialHospitals: Hospital[];
};

export default function UrbanBeeClient({
  initialZones,
  initialHospitals,
}: UrbanBeeClientProps) {
  const [zones] = useState<UrbanZone[]>(initialZones);
  const [hospitals] = useState<Hospital[]>(initialHospitals);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="relative h-screen w-full p-4">
          {isClient ? <MapPlaceholder /> : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <p className="text-xl font-semibold">Cargando mapa...</p>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}