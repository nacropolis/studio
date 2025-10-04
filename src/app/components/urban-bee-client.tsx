'use client';

import { useState } from 'react';
import type { Recommendation, UrbanZone, Hospital } from '@/lib/types';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { MapPlaceholder } from './map-view';
import { getRecommendations } from '@/app/actions';

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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="relative h-screen w-full p-4">
          <MapPlaceholder />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
