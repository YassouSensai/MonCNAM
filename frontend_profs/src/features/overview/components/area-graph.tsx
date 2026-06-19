'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

export function AreaGraph() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendance de présence</CardTitle>
        <CardDescription>Sélectionnez un module ci-dessus pour voir la tendance.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className='text-muted-foreground text-sm'>Aucune donnée.</p>
      </CardContent>
    </Card>
  );
}
