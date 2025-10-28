import { NextRequest, NextResponse } from 'next/server';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

// Simple in-memory rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0] : 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const clientData = requestCounts.get(ip);
  
  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (clientData.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  clientData.count++;
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = Math.min(parseInt(searchParams.get('per_page') || '25'), 100);
    const category = searchParams.get('category');
    const order = searchParams.get('order') || 'market_cap_desc';
    
    // Rate limiting check
    const clientIp = getClientIp(request);
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { status: 429 });
    }

    // Prepare headers with optional API key
    const apiKey = process.env.NEXT_PUBLIC_CRYPTO_API_KEY;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'StudIQ/1.0',
    };
    
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    // Build CoinGecko API URL
    let coingeckoUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=${order}&per_page=${per_page}&page=${page}&sparkline=true&price_change_percentage=1h%2C24h%2C7d&locale=en`;
    
    if (category) {
      coingeckoUrl += `&category=${category}`;
    }

    const response = await fetch(coingeckoUrl, { headers });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the data to match our interface
    const transformedData = data.map((coin: {
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
      roi: { times: number; currency: string; percentage: number } | null;
      last_updated: string;
      sparkline_in_7d?: { price: number[] };
      price_change_percentage_7d_in_currency?: number;
    }) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      current_price: coin.current_price || 0,
      market_cap: coin.market_cap || 0,
      market_cap_rank: coin.market_cap_rank || 0,
      fully_diluted_valuation: coin.fully_diluted_valuation || 0,
      total_volume: coin.total_volume || 0,
      high_24h: coin.high_24h || coin.current_price || 0,
      low_24h: coin.low_24h || coin.current_price || 0,
      price_change_24h: coin.price_change_24h || 0,
      price_change_percentage_24h: coin.price_change_percentage_24h || 0,
      price_change_percentage_7d_in_currency: coin.price_change_percentage_7d_in_currency || 0,
      market_cap_change_24h: coin.market_cap_change_24h || 0,
      market_cap_change_percentage_24h: coin.market_cap_change_percentage_24h || 0,
      circulating_supply: coin.circulating_supply || 0,
      total_supply: coin.total_supply || 0,
      max_supply: coin.max_supply || 0,
      ath: coin.ath || 0,
      ath_change_percentage: coin.ath_change_percentage || 0,
      ath_date: coin.ath_date,
      atl: coin.atl || 0,
      atl_change_percentage: coin.atl_change_percentage || 0,
      atl_date: coin.atl_date,
      roi: coin.roi,
      last_updated: coin.last_updated,
      sparkline_in_7d: coin.sparkline_in_7d?.price || [],
    }));

    return NextResponse.json({
      data: transformedData,
      total_count: transformedData.length,
      page,
      per_page,
      has_more: transformedData.length === per_page
    });
    
  } catch (error) {
    console.error('Markets API error:', error);
    
    // Return comprehensive mock data as fallback
    const mockData = [
      {
        id: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
        current_price: 43250.00,
        market_cap: 850000000000,
        market_cap_rank: 1,
        fully_diluted_valuation: 910000000000,
        total_volume: 15000000000,
        high_24h: 44100.00,
        low_24h: 42800.00,
        price_change_24h: -520.00,
        price_change_percentage_24h: -1.2,
        price_change_percentage_1h_in_currency: 0.3,
        price_change_percentage_7d_in_currency: 2.1,
        market_cap_change_24h: -10200000000,
        market_cap_change_percentage_24h: -1.19,
        circulating_supply: 19650000,
        total_supply: 21000000,
        max_supply: 21000000,
        ath: 69045,
        ath_change_percentage: -37.4,
        ath_date: '2021-11-10T14:24:11.849Z',
        atl: 67.81,
        atl_change_percentage: 63650.8,
        atl_date: '2013-07-06T00:00:00.000Z',
        roi: null,
        last_updated: new Date().toISOString(),
        sparkline_in_7d: Array.from({ length: 168 }, (_, i) => 43250 + Math.sin(i / 24) * 1000),
        price_change_percentage_14d_in_currency: 5.2,
        price_change_percentage_30d_in_currency: 8.7,
        price_change_percentage_200d_in_currency: 15.3,
        price_change_percentage_1y_in_currency: 125.4,
      },
      {
        id: 'ethereum',
        symbol: 'ETH',
        name: 'Ethereum',
        image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
        current_price: 2650.00,
        market_cap: 320000000000,
        market_cap_rank: 2,
        fully_diluted_valuation: 320000000000,
        total_volume: 8500000000,
        high_24h: 2720.00,
        low_24h: 2580.00,
        price_change_24h: 45.00,
        price_change_percentage_24h: 1.7,
        price_change_percentage_1h_in_currency: -0.2,
        price_change_percentage_7d_in_currency: 3.8,
        market_cap_change_24h: 5400000000,
        market_cap_change_percentage_24h: 1.71,
        circulating_supply: 120280000,
        total_supply: 120280000,
        max_supply: null,
        ath: 4878.26,
        ath_change_percentage: -45.7,
        ath_date: '2021-11-10T14:24:19.604Z',
        atl: 0.432979,
        atl_change_percentage: 612150.1,
        atl_date: '2015-10-20T00:00:00.000Z',
        roi: null,
        last_updated: new Date().toISOString(),
        sparkline_in_7d: Array.from({ length: 168 }, (_, i) => 2650 + Math.sin(i / 20) * 150),
        price_change_percentage_14d_in_currency: 4.1,
        price_change_percentage_30d_in_currency: 12.3,
        price_change_percentage_200d_in_currency: 22.7,
        price_change_percentage_1y_in_currency: 89.2,
      },
      {
        id: 'solana',
        symbol: 'SOL',
        name: 'Solana',
        image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
        current_price: 165.00,
        market_cap: 75000000000,
        market_cap_rank: 5,
        fully_diluted_valuation: 82500000000,
        total_volume: 2500000000,
        high_24h: 168.50,
        low_24h: 162.00,
        price_change_24h: 5.10,
        price_change_percentage_24h: 3.1,
        price_change_percentage_1h_in_currency: 0.8,
        price_change_percentage_7d_in_currency: 8.2,
        market_cap_change_24h: 2300000000,
        market_cap_change_percentage_24h: 3.17,
        circulating_supply: 454500000,
        total_supply: 500000000,
        max_supply: null,
        ath: 259.96,
        ath_change_percentage: -36.5,
        ath_date: '2021-11-06T21:54:35.825Z',
        atl: 0.500801,
        atl_change_percentage: 32850.2,
        atl_date: '2020-05-11T19:35:23.449Z',
        roi: null,
        last_updated: new Date().toISOString(),
        sparkline_in_7d: Array.from({ length: 168 }, (_, i) => 165 + Math.sin(i / 16) * 8),
        price_change_percentage_14d_in_currency: 12.5,
        price_change_percentage_30d_in_currency: 18.9,
        price_change_percentage_200d_in_currency: 45.2,
        price_change_percentage_1y_in_currency: 234.7,
      }
    ];

    return NextResponse.json({
      data: mockData,
      total_count: mockData.length,
      page: 1,
      per_page: 25,
      has_more: false
    }, { status: 200 });
  }
}

// Enable CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}