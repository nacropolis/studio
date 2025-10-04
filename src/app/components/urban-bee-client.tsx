'use client';

import { useState } from 'react';
import type { Recommendation, UrbanZone, Hospital } from '@/lib/types';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { MapView } from './map-view';
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

  const [showHospitals, setShowHospitals] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [priorityThreshold, setPriorityThreshold] = useState(0.6);
  const [isLoading, setIsLoading] = useState(false);

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
            showHeatmap={showHeatmap}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

    