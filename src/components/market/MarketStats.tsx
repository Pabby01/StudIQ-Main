import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MarketStats(_props?: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div>Total Markets: —</div>
          <div>Top Gainer: —</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MarketStats;
