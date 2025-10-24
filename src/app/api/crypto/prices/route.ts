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
    const ids = searchParams.get('ids');
    const vs_currencies = searchParams.get('vs_currencies') || 'usd';
    
    if (!ids) {
      return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
    }

    // Rate limiting check
    const clientIp = getClientIp(request);
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { status: 429 });
    }

    // Make the actual API call to CoinGecko
    const coingeckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs_currencies}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
    
    const response = await fetch(coingeckoUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'StudIQ/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the data to match our expected format
    const transformedData = Object.entries(data).map(([id, info]) => {
      const priceInfo = info as { usd: number; usd_24h_change?: number; usd_market_cap?: number; usd_24h_vol?: number };
      return {
        id,
        symbol: id.toUpperCase(),
        name: id.charAt(0).toUpperCase() + id.slice(1),
        price: priceInfo.usd,
        changePercent24h: priceInfo.usd_24h_change || 0,
        marketCap: priceInfo.usd_market_cap || 0,
        volume24h: priceInfo.usd_24h_vol || 0,
      };
    });

    return NextResponse.json(transformedData);
    
  } catch (error) {
    console.error('Crypto prices API error:', error);
    
    // Return mock data as fallback
    const mockData = [
      {
        id: 'solana',
        symbol: 'SOL',
        name: 'Solana',
        price: 89.54,
        changePercent24h: 2.4,
        marketCap: 38500000000,
        volume24h: 1200000000,
      },
      {
        id: 'usd-coin',
        symbol: 'USDC',
        name: 'USD Coin',
        price: 1.00,
        changePercent24h: 0.01,
        marketCap: 25000000000,
        volume24h: 3500000000,
      },
      {
        id: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 43250.00,
        changePercent24h: -1.2,
        marketCap: 850000000000,
        volume24h: 15000000000,
      },
      {
        id: 'solana',
        symbol: 'SOL',
        name: 'Solana',
        price: 165.00,
        changePercent24h: 3.1,
        marketCap: 75000000000,
        volume24h: 2500000000,
      },
    ];

    return NextResponse.json(mockData, { status: 200 });
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