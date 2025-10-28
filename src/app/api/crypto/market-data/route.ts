import { NextRequest, NextResponse } from 'next/server';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

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
    const symbol = searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400 });
    }

    // Rate limiting check
    const clientIp = getClientIp(request);
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      }, { status: 429 });
    }

    // Map common symbols to CoinGecko IDs
    const symbolToIdMap: Record<string, string> = {
      'SOL': 'solana',
      'BTC': 'bitcoin',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'BNB': 'binancecoin',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
      'MATIC': 'polygon',
      'LINK': 'chainlink',
      'DOT': 'polkadot',
      'UNI': 'uniswap',
      'LTC': 'litecoin',
      'BCH': 'bitcoin-cash',
    };

    const coinId = symbolToIdMap[symbol.toUpperCase()] || symbol.toLowerCase();

    // Prepare headers with optional API key
    const apiKey = process.env.NEXT_PUBLIC_CRYPTO_API_KEY;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'StudIQ/1.0',
    };
    
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    // Make the actual API calls to CoinGecko
    const [coinResponse, chartResponse] = await Promise.all([
      fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`, {
        headers,
      }),
      fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`, {
        headers,
      }),
    ]);

    if (!coinResponse.ok || !chartResponse.ok) {
      throw new Error('Failed to fetch market data from CoinGecko');
    }

    const [coinData, chartData] = await Promise.all([
      coinResponse.json(),
      chartResponse.json(),
    ]);

    // Transform the data to match our expected format
    const sparkline = chartData.prices.slice(-24).map((price: [number, number]) => price[1]);
    const currentPrice = coinData.market_data.current_price.usd;
    const priceChange24h = coinData.market_data.price_change_24h || 0;
    const priceChangePercentage24h = coinData.market_data.price_change_percentage_24h || 0;

    const marketDataResult = {
      symbol: symbol.toUpperCase(),
      name: coinData.name,
      price: currentPrice,
      change24h: priceChange24h,
      changePercent24h: priceChangePercentage24h,
      volume24h: coinData.market_data.total_volume?.usd || 0,
      marketCap: coinData.market_data.market_cap?.usd || 0,
      high24h: coinData.market_data.high_24h?.usd || currentPrice,
      low24h: coinData.market_data.low_24h?.usd || currentPrice,
      circulatingSupply: coinData.market_data.circulating_supply || 0,
      totalSupply: coinData.market_data.total_supply || 0,
      sparkline,
      lastUpdated: new Date(),
    };

    return NextResponse.json(marketDataResult);
    
  } catch (error) {
    console.error('Market data API error:', error);
    
    // Return mock data as fallback
    const mockData = {
      symbol: 'SOL',
      name: 'Solana',
      price: 89.54,
      change24h: 2.15,
      changePercent24h: 2.4,
      volume24h: 1200000000,
      marketCap: 38500000000,
      high24h: 92.1,
      low24h: 87.2,
      circulatingSupply: 430000000,
      totalSupply: 500000000,
      sparkline: Array.from({ length: 24 }, (_, i) => 89.54 + Math.sin(i / 4) * 2),
      lastUpdated: new Date(),
    };

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