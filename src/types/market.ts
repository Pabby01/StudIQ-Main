export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_1h_in_currency: number;
  price_change_percentage_7d_in_currency: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number | null;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: {
    times: number;
    currency: string;
    percentage: number;
  } | null;
  last_updated: string;
  sparkline_in_7d: number[];
  price_change_percentage_14d_in_currency: number;
  price_change_percentage_30d_in_currency: number;
  price_change_percentage_200d_in_currency: number;
  price_change_percentage_1y_in_currency: number;
}

export interface MarketResponse {
  data: MarketCoin[];
  total_count: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface MarketFilters {
  search: string;
  category: string;
  order: 'market_cap_desc' | 'market_cap_asc' | 'volume_desc' | 'volume_asc' | 'id_asc' | 'id_desc';
  page: number;
  per_page: number;
}

export interface MarketState {
  coins: MarketCoin[];
  loading: boolean;
  error: string | null;
  filters: MarketFilters;
  favorites: string[];
  lastUpdated: Date | null;
  hasMore: boolean;
  totalCount: number;
}

export interface PriceChangeIndicatorProps {
  value: number;
  showIcon?: boolean;
  className?: string;
}

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

export interface MarketTableProps {
  coins: MarketCoin[];
  loading: boolean;
  favorites: string[];
  onToggleFavorite: (coinId: string) => void;
  onSort: (field: keyof MarketCoin) => void;
  sortField?: keyof MarketCoin;
  sortDirection?: 'asc' | 'desc';
}

export interface MarketCardProps {
  coin: MarketCoin;
  isFavorite: boolean;
  onToggleFavorite: (coinId: string) => void;
}

export interface MarketStatsProps {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChange24h: number;
}

export type SortField = keyof MarketCoin;
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}