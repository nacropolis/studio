'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MapPlaceholder() {
  return (
    <Card className="w-full h-full flex flex-col items-center justify-center bg-muted/50">
      <CardHeader>
        <CardTitle>Map Placeholder</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-center">
          Your map component will be rendered here.
          <br />
          Implement your chosen map library inside this component.
        </p>
      </CardContent>
    </Card>
  );
}
