'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Recommendation } from '@/lib/types';
import { Lightbulb, X } from 'lucide-react';

type RecommendationsListProps = {
  recommendations: Recommendation[];
  onClose: () => void;
};

export function RecommendationsList({ recommendations, onClose }: RecommendationsListProps) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="absolute top-4 right-4 w-96 max-h-[calc(100vh-2rem)] flex flex-col shadow-lg z-10 bg-card/90 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="text-accent" />
            <span>AI Recommendations</span>
          </CardTitle>
          <CardDescription>
            New hospital locations based on your criteria.
          </CardDescription>
        </div>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X size={20} />
        </button>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="p-3 rounded-lg border bg-background">
                <h4 className="font-bold text-primary">{rec.location}</h4>
                <p className="text-sm text-foreground/80 mt-1">{rec.reason}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
