import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type MarketTableProps = {
  coins?: unknown[];
  loading?: boolean;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
  onSort?: (field: string) => void;
};

export function MarketTable({ coins = [], loading = false, favorites = [] }: MarketTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Markets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-600">
          {loading ? 'Loading market data…' : `Showing ${coins.length} items${favorites.length ? ` • ${favorites.length} favorites` : ''}.`}
        </div>
      </CardContent>
    </Card>
  );
}

export default MarketTable;
