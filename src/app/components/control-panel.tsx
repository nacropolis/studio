'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Loader } from 'lucide-react';

type ControlPanelProps = {
  showHospitals: boolean;
  onShowHospitalsChange: (value: boolean) => void;
  showZones: boolean;
  onShowZonesChange: (value: boolean) => void;
  showHeatmap: boolean;
  onShowHeatmapChange: (value: boolean) => void;
  priorityThreshold: number;
  onPriorityThresholdChange: (value: number) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
};

export function ControlPanel({
  showHospitals,
  onShowHospitalsChange,
  showZones,
  onShowZonesChange,
  showHeatmap,
  onShowHeatmapChange,
  priorityThreshold,
  onPriorityThresholdChange,
  onAnalyze,
  isAnalyzing
}: ControlPanelProps) {
  return (
    <Card className="absolute top-4 left-4 w-80 shadow-lg z-10">
      <CardHeader>
        <CardTitle>Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
            <h4 className="font-semibold">Map Layers</h4>
            <div className="flex items-center justify-between">
                <Label htmlFor="show-hospitals">Show Hospitals</Label>
                <Switch id="show-hospitals" checked={showHospitals} onCheckedChange={onShowHospitalsChange} />
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="show-zones">Show Priority Zones</Label>
                <Switch id="show-zones" checked={showZones} onCheckedChange={onShowZonesChange} />
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="show-heatmap">Show Population Heatmap</Label>
                <Switch id="show-heatmap" checked={showHeatmap} onCheckedChange={onShowHeatmapChange} />
            </div>
        </div>
        <div className="space-y-4">
            <h4 className="font-semibold">AI Recommendations</h4>
            <div>
                <Label htmlFor="priority-threshold">Priority Threshold: {priorityThreshold.toFixed(2)}</Label>
                <Slider
                    id="priority-threshold"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={[priorityThreshold]}
                    onValueChange={(value) => onPriorityThresholdChange(value[0])}
                    className="mt-2"
                />
            </div>
            <Button onClick={onAnalyze} disabled={isAnalyzing} className="w-full bg-primary hover:bg-primary/90">
                {isAnalyzing ? (
                    <Loader className="animate-spin" />
                ) : (
                    <BrainCircuit />
                )}
                <span>{isAnalyzing ? "Analyzing..." : "Find New Locations"}</span>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
