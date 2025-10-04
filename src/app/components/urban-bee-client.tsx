'use client';

import { useState } from 'react';
import type { Hospital, Recommendation, UrbanZone } from '@/lib/types';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { MapView } from './map-view';
import { ControlPanel } from './control-panel';
import { getRecommendations } from '../actions';
import { useToast } from '@/hooks/use-toast';
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
  
  const [showHospitals, setShowHospitals] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [priorityThreshold, setPriorityThreshold] = useState(0.6);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await getRecommendations(zones, priorityThreshold);
      setRecommendations(result);
      if (result.length === 0) {
        toast({
          title: "No Recommendations",
          description: "No zones met the high-priority threshold for a new hospital.",
        });
      } else {
        toast({
          title: "Analysis Complete",
          description: `Found ${result.length} potential locations for new hospitals.`,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "An error occurred while generating recommendations.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

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
          <ControlPanel
            showHospitals={showHospitals}
            onShowHospitalsChange={setShowHospitals}
            showZones={showZones}
            onShowZonesChange={setShowZones}
            showHeatmap={showHeatmap}
            onShowHeatmapChange={setShowHeatmap}
            priorityThreshold={priorityThreshold}
            onPriorityThresholdChange={setPriorityThreshold}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
          <RecommendationsList 
            recommendations={recommendations}
            onClose={() => setRecommendations([])}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
