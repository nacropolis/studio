'use client';

import { useState } from 'react';
import type { Hospital, UrbanZone } from '@/lib/types';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { MapView } from './map-view';
import { RecommendationsList } from './recommendations-list';

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
  
  const [showHospitals] = useState(true);
  const [showZones] = useState(true);
  const [showHeatmap] = useState(false);
  
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="relative h-screen w-full">
          <MapView
            hospitals={hospitals}
            zones={zones}
            recommendations={[]}
            showHospitals={showHospitals}
            showZones={showZones}
            showHeatmap={showHeatmap}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
