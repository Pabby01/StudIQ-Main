import { secureLogger } from './secure-logger';

export interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: Date;
}

export interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap: number;
  high24h: number;
  low24h: number;
  circulatingSupply: number;
  totalSupply: number;
  sparkline: number[];
  lastUpdated: Date;
}

export interface TransactionRequest {
  toAddress: string;
  amount: number;
  token: string;
  walletAddress: string;
  twoFactorCode?: string;
}

export interface TransactionResponse {
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
  amount: number;
  token: string;
  toAddress: string;
  fromAddress: string;
  fee: number;
}

export interface DepositRequest {
  token: string;
  amount: number;
  walletAddress: string;
}

export interface WithdrawalRequest {
  toAddress: string;
  amount: number;
  token: string;
  walletAddress: string;
  twoFactorCode?: string;
}

interface CoinGeckoPriceData {
  usd: number;
  usd_24h_change?: number;
  usd_24h_vol?: number;
  usd_market_cap?: number;
}

class CryptoApiService {
  private readonly BASE_URL = process.env.NEXT_PUBLIC_CRYPTO_API_URL || 'https://api.coingecko.com/api/v3';
  private readonly API_KEY = process.env.NEXT_PUBLIC_CRYPTO_API_KEY;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private lastRequestTime = 0;
  private requestQueue: (() => Promise<void>)[] = [];
  private isProcessingQueue = false;
  
  private priceCache: Map<string, { data: CryptoPrice; timestamp: number }> = new Map();
  private marketCache: Map<string, { data: MarketData; timestamp: number }> = new Map();

  // Rate limiting helper
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const waitTime = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  // Process request queue to prevent overwhelming the API
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await this.enforceRateLimit();
        await request();
      }
    }
    
    this.isProcessingQueue = false;
  }

  // Generic API call with error handling and fallback
  private async makeApiCall<T>(
    apiCall: () => Promise<T>,
    fallbackData?: T,
    errorMessage?: string
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      secureLogger.error(errorMessage || 'API call failed', error);
      
      if (fallbackData) {
        secureLogger.warn('Using fallback data');
        return fallbackData;
      }
      
      throw error;
    }
  }

  // Get current prices for multiple cryptocurrencies
  async getCryptoPrices(symbols: string[]): Promise<CryptoPrice[]> {
    const now = Date.now();
    const uncachedSymbols: string[] = [];
    const cachedPrices: CryptoPrice[] = [];

    // Check cache first
    symbols.forEach(symbol => {
      const cached = this.priceCache.get(symbol.toLowerCase());
      if (cached && now - cached.timestamp < this.CACHE_DURATION) {
        cachedPrices.push(cached.data);
      } else {
        uncachedSymbols.push(symbol);
      }
    });

    if (uncachedSymbols.length === 0) {
      return cachedPrices;
    }

    try {
      // Use our proxy API route to avoid CORS and rate limiting issues
      const ids = uncachedSymbols.map(s => s.toLowerCase()).join(',');
      const response = await fetch(`/api/crypto/prices?ids=${ids}&vs_currencies=usd`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch crypto prices');
      }

      const data = await response.json();
      const prices: CryptoPrice[] = [];

      // Handle both successful API responses and fallback mock data
      if (Array.isArray(data)) {
        data.forEach((item: { symbol: string; price: number; change24h?: number; changePercent24h?: number; volume24h?: number; marketCap?: number }) => {
          const priceData: CryptoPrice = {
            symbol: item.symbol,
            price: item.price,
            change24h: item.change24h || 0,
            changePercent24h: item.changePercent24h || 0,
            volume24h: item.volume24h || 0,
            marketCap: item.marketCap || 0,
            lastUpdated: new Date(),
          };

          this.priceCache.set(item.symbol.toLowerCase(), { data: priceData, timestamp: now });
          prices.push(priceData);
        });
      } else {
        // Fallback for different response format
        Object.entries(data).forEach(([coinId, info]) => {
          const symbol = uncachedSymbols.find(s => s.toLowerCase() === coinId) || coinId.toUpperCase();
          const priceData: CryptoPrice = {
            symbol: symbol.toUpperCase(),
            price: (info as CoinGeckoPriceData).usd,
            change24h: (info as CoinGeckoPriceData).usd_24h_change || 0,
            changePercent24h: (info as CoinGeckoPriceData).usd_24h_change || 0,
            volume24h: (info as CoinGeckoPriceData).usd_24h_vol || 0,
            marketCap: (info as CoinGeckoPriceData).usd_market_cap || 0,
            lastUpdated: new Date(),
          };

          this.priceCache.set(symbol.toLowerCase(), { data: priceData, timestamp: now });
          prices.push(priceData);
        });
      }

      return [...cachedPrices, ...prices];
    } catch (error) {
      secureLogger.error('Failed to fetch crypto prices', error);
      
      // Return cached data if available, otherwise throw error
      if (cachedPrices.length > 0) {
        secureLogger.warn('Using cached prices due to API error');
        return cachedPrices;
      }
      
      throw error;
    }
  }

  // Get detailed market data
  async getMarketData(symbol: string): Promise<MarketData> {
    const now = Date.now();
    const cached = this.marketCache.get(symbol.toLowerCase());
    
    if (cached && now - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Use our proxy API route to avoid CORS and rate limiting issues
      const response = await fetch(`/api/crypto/market-data?symbol=${symbol}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }

      const data = await response.json();
      
      // Cache the result
      this.marketCache.set(symbol.toLowerCase(), { data, timestamp: now });
      return data;
    } catch (error) {
      secureLogger.error('Failed to fetch market data', error);
      
      // Return cached data if available, otherwise throw error
      if (cached) {
        secureLogger.warn('Using cached market data due to API error');
        return cached.data;
      }
      
      throw error;
    }
  }

  // Send cryptocurrency transaction
  async sendTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    try {
      const response = await fetch('/api/transactions/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Transaction failed');
      }

      const result = await response.json();
      return {
        ...result,
        timestamp: new Date(result.timestamp),
      };
    } catch (error) {
      secureLogger.error('Transaction failed', error);
      throw error;
    }
  }

  // Process deposit
  async processDeposit(request: DepositRequest): Promise<TransactionResponse> {
    try {
      const response = await fetch('/api/transactions/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Deposit failed');
      }

      const result = await response.json();
      return {
        ...result,
        timestamp: new Date(result.timestamp),
      };
    } catch (error) {
      secureLogger.error('Deposit failed', error);
      throw error;
    }
  }

  // Process withdrawal
  async processWithdrawal(request: WithdrawalRequest): Promise<TransactionResponse> {
    try {
      const response = await fetch('/api/transactions/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Withdrawal failed');
      }

      const result = await response.json();
      return {
        ...result,
        timestamp: new Date(result.timestamp),
      };
    } catch (error) {
      secureLogger.error('Withdrawal failed', error);
      throw error;
    }
  }

  // Get transaction history
  async getTransactionHistory(walletAddress: string, limit: number = 50): Promise<TransactionResponse[]> {
    try {
      const response = await fetch(`/api/transactions/history?walletAddress=${walletAddress}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }

      const result = await response.json();
      return result.map((tx: TransactionResponse) => ({
        ...tx,
        timestamp: new Date(tx.timestamp),
      }));
    } catch (error) {
      secureLogger.error('Failed to fetch transaction history', error);
      throw error;
    }
  }

  // Get exchange rates
  async getExchangeRates(fromSymbol: string, toSymbol: string): Promise<number> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/simple/price?ids=${fromSymbol.toLowerCase()}&vs_currencies=${toSymbol.toLowerCase()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }

      const data = await response.json();
      return data[fromSymbol.toLowerCase()]?.[toSymbol.toLowerCase()] || 0;
    } catch (error) {
      secureLogger.error('Failed to fetch exchange rates', error);
      throw error;
    }
  }

  // Validate wallet address
  validateWalletAddress(address: string, blockchain: string): boolean {
    // Solana-only wallet validation
    if (blockchain.toLowerCase() !== 'solana') {
      return false;
    }
    // Solana addresses are base58 encoded and typically 32-44 characters
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  // Get authentication token
  private getAuthToken(): string {
    // In a real implementation, this would get the token from your auth system
    return localStorage.getItem('auth_token') || '';
  }

  // Clear cache
  clearCache(): void {
    this.priceCache.clear();
    this.marketCache.clear();
  }
}

// Create singleton instance
export const cryptoApiService = new CryptoApiService();

// Export types for use in components
// Types are already exported as interfaces above