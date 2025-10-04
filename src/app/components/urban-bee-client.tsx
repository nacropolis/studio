'use client';

import { useState } from 'react';
import type { Recommendation, UrbanZone, Hospital } from '@/lib/types';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import dynamic from 'next/dynamic';
import { getRecommendations } from '@/app/actions';

const MapView = dynamic(() => import('./map-view').then(mod => mod.MapView), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted animate-pulse" />,
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

  // For simplicity, we're hardcoding these to true for now
  const [showHospitals, setShowHospitals] = useState(true);
  const [showZones, setShowZones] = useState(true);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="relative h-screen w-full">
          <MapView
            hospitals={hospitals}
            zones={zones}
            recommendations={recommendations}
            showHospitals={showHospitals}
            showZones={showZones}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
