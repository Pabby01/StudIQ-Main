/* eslint-disable @typescript-eslint/no-unused-vars */
import { secureLogger } from './secure-logger';
import { auditLogger } from './audit-logger';

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

export interface TransactionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TransactionLimits {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  requiresVerification: boolean;
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

// Client-side crypto API service without Redis dependencies
export class ClientCryptoApiService {
  private readonly BASE_URL = process.env.NEXT_PUBLIC_CRYPTO_API_URL || 'https://api.coingecko.com/api/v3';
  private readonly API_KEY = process.env.NEXT_PUBLIC_CRYPTO_API_KEY;
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private readonly MAX_TRANSACTION_AMOUNT = 1000000; // $1M USD equivalent
  private readonly MIN_TRANSACTION_AMOUNT = 0.001; // Minimum transaction amount
  private readonly DAILY_TRANSACTION_LIMIT = 50000; // $50K daily limit
  private readonly SUPPORTED_TOKENS = ['SOL', 'USDC', 'USDT', 'BONK', 'JUP'];
  
  private lastRequestTime = 0;
  private requestQueue: (() => Promise<void>)[] = [];
  private isProcessingQueue = false;
  private dailyTransactionVolume: Map<string, number> = new Map(); // wallet -> daily volume
  private transactionHistory: Map<string, TransactionResponse[]> = new Map(); // wallet -> transactions
  
  private priceCache: Map<string, { data: CryptoPrice; timestamp: number }> = new Map();
  private marketCache: Map<string, { data: MarketData; timestamp: number }> = new Map();
  
  // Simple in-memory rate limiting for client-side
  private rateLimitMax = 100; // Max requests per window
  private rateLimitWindow = 60; // Window in seconds (1 minute)
  private rateLimitMap: Map<string, number[]> = new Map(); // operation -> timestamps

  /**
   * Initialize the service (client-side version)
   */
  async initialize(): Promise<void> {
    secureLogger.info('Client-side crypto API service initialized (no Redis)');
  }

  /**
   * Simple in-memory rate limiting for client-side
   */
  private checkInMemoryRateLimit(operation: string): boolean {
    const now = Date.now();
    const windowStart = now - this.rateLimitWindow * 1000;
    
    if (!this.rateLimitMap.has(operation)) {
      this.rateLimitMap.set(operation, []);
    }
    
    const timestamps = this.rateLimitMap.get(operation)!;
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (validTimestamps.length >= this.rateLimitMax) {
      return false;
    }
    
    // Add current timestamp
    validTimestamps.push(now);
    this.rateLimitMap.set(operation, validTimestamps);
    
    return true;
  }

  /**
   * Enhanced rate limiting with in-memory fallback
   */
  private async checkRateLimit(operation: 'api' | 'transactions' | 'auth' | 'prices'): Promise<boolean> {
    // Use in-memory rate limiting for client-side
    return this.checkInMemoryRateLimit(operation);
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientId(): string {
    return 'client_browser';
  }

  /**
   * Get rate limit status for an operation
   */
  async getRateLimitStatus(operation: 'api' | 'transactions' | 'auth' | 'prices'): Promise<{
    allowed: boolean;
    current: number;
    remaining: number;
    resetTime: Date;
  }> {
    // Simple in-memory status for client-side
    const now = Date.now();
    const windowStart = now - this.rateLimitWindow * 1000;
    
    if (!this.rateLimitMap.has(operation)) {
      this.rateLimitMap.set(operation, []);
    }
    
    const timestamps = this.rateLimitMap.get(operation)!;
    const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
    const current = validTimestamps.length;
    const remaining = Math.max(0, this.rateLimitMax - current);
    
    return {
      allowed: current < this.rateLimitMax,
      current,
      remaining,
      resetTime: new Date(now + this.rateLimitWindow * 1000)
    };
  }

  /**
   * Process queued requests with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      
      try {
        await request();
      } catch (error) {
        secureLogger.error('Error processing queued request', error);
      }

      // Rate limiting delay
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest));
      }
      this.lastRequestTime = Date.now();
    }

    this.isProcessingQueue = false;
  }

  /**
   * Queue a request for processing with rate limiting
   */
  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest = async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      this.requestQueue.push(queuedRequest);
      this.processQueue();
    });
  }

  /**
   * Get cryptocurrency price data
   */
  async getCryptoPrice(symbol: string): Promise<CryptoPrice> {
    // Check rate limit
    if (!await this.checkRateLimit('prices')) {
      throw new Error('Rate limit exceeded for price requests');
    }

    const cacheKey = symbol.toLowerCase();
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    return this.queueRequest(async () => {
      try {
        const response = await fetch(`${this.BASE_URL}/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`);
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        const priceData = data[symbol.toLowerCase()];
        
        if (!priceData) {
          throw new Error(`No data available for ${symbol}`);
        }

        const cryptoPrice: CryptoPrice = {
          symbol: symbol.toUpperCase(),
          price: priceData.usd,
          change24h: priceData.usd_24h_change || 0,
          changePercent24h: priceData.usd_24h_change || 0,
          volume24h: priceData.usd_24h_vol || 0,
          marketCap: priceData.usd_market_cap || 0,
          lastUpdated: new Date()
        };

        this.priceCache.set(cacheKey, { data: cryptoPrice, timestamp: Date.now() });
        return cryptoPrice;
      } catch (error) {
        secureLogger.error('Error fetching crypto price', { symbol, error });
        throw error;
      }
    });
  }

  /**
   * Get market data for a cryptocurrency
   */
  async getMarketData(symbol: string): Promise<MarketData> {
    // Check rate limit
    if (!await this.checkRateLimit('api')) {
      throw new Error('Rate limit exceeded for API requests');
    }

    const cacheKey = symbol.toLowerCase();
    const cached = this.marketCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    return this.queueRequest(async () => {
      try {
        const response = await fetch(`${this.BASE_URL}/coins/${symbol.toLowerCase()}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`);
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.market_data) {
          throw new Error(`No market data available for ${symbol}`);
        }

        const marketData: MarketData = {
          symbol: symbol.toUpperCase(),
          name: data.name,
          price: data.market_data.current_price.usd,
          change24h: data.market_data.price_change_24h || 0,
          changePercent24h: data.market_data.price_change_percentage_24h || 0,
          volume24h: data.market_data.total_volume.usd || 0,
          marketCap: data.market_data.market_cap.usd || 0,
          high24h: data.market_data.high_24h.usd || 0,
          low24h: data.market_data.low_24h.usd || 0,
          circulatingSupply: data.market_data.circulating_supply || 0,
          totalSupply: data.market_data.total_supply || 0,
          sparkline: data.market_data.sparkline_7d?.price || [],
          lastUpdated: new Date()
        };

        this.marketCache.set(cacheKey, { data: marketData, timestamp: Date.now() });
        return marketData;
      } catch (error) {
        secureLogger.error('Error fetching market data', { symbol, error });
        throw error;
      }
    });
  }

  /**
   * Get multiple cryptocurrency prices
   */
  async getCryptoPrices(symbols: string[]): Promise<CryptoPrice[]> {
    const promises = symbols.map(symbol => this.getCryptoPrice(symbol));
    return Promise.all(promises);
  }

  /**
   * Validate wallet address
   */
  validateWalletAddress(address: string, blockchain: string): boolean {
    // Basic validation - can be enhanced based on blockchain requirements
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Remove whitespace
    address = address.trim();

    switch (blockchain.toLowerCase()) {
      case 'solana':
        // Solana addresses are typically 32-44 characters and base58 encoded
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      
      case 'ethereum':
        // Ethereum addresses are 42 characters (0x + 40 hex chars)
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      
      case 'bitcoin':
        // Bitcoin addresses vary by type
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,62}$/.test(address) || // Legacy
               /^[bc]1[a-z0-9]{39,59}$/i.test(address); // Bech32
      
      default:
        return false;
    }
  }

  /**
   * Validate transaction request
   */
  async validateTransaction(request: TransactionRequest): Promise<TransactionValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate wallet address
    if (!this.validateWalletAddress(request.toAddress, 'solana')) {
      errors.push('Invalid recipient wallet address');
    }

    // Validate amount
    if (request.amount <= 0) {
      errors.push('Amount must be greater than zero');
    }

    if (request.amount > this.MAX_TRANSACTION_AMOUNT) {
      errors.push(`Amount exceeds maximum transaction limit of $${this.MAX_TRANSACTION_AMOUNT.toLocaleString()}`);
    }

    if (request.amount < this.MIN_TRANSACTION_AMOUNT) {
      warnings.push(`Amount is below recommended minimum of ${this.MIN_TRANSACTION_AMOUNT}`);
    }

    // Validate token
    if (!this.SUPPORTED_TOKENS.includes(request.token.toUpperCase())) {
      errors.push(`Unsupported token: ${request.token}`);
    }

    // Check daily limit
    const dailyVolume = this.dailyTransactionVolume.get(request.walletAddress) || 0;
    if (dailyVolume + request.amount > this.DAILY_TRANSACTION_LIMIT) {
      errors.push(`Daily transaction limit of $${this.DAILY_TRANSACTION_LIMIT.toLocaleString()} exceeded`);
    }

    // Validate 2FA code if required
    if (request.amount > 1000 && !request.twoFactorCode) {
      warnings.push('Two-factor authentication recommended for transactions over $1,000');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get transaction limits for a wallet
   */
  getTransactionLimits(walletAddress: string): TransactionLimits {
    const dailyVolume = this.dailyTransactionVolume.get(walletAddress) || 0;
    const remainingDailyLimit = this.DAILY_TRANSACTION_LIMIT - dailyVolume;

    return {
      minAmount: this.MIN_TRANSACTION_AMOUNT,
      maxAmount: Math.min(this.MAX_TRANSACTION_AMOUNT, remainingDailyLimit),
      dailyLimit: this.DAILY_TRANSACTION_LIMIT,
      requiresVerification: remainingDailyLimit < this.MAX_TRANSACTION_AMOUNT * 0.1
    };
  }

  /**
   * Send transaction (client-side simulation)
   */
  async sendTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    // Check rate limit
    if (!await this.checkRateLimit('transactions')) {
      throw new Error('Rate limit exceeded for transactions');
    }

    // Validate transaction
    const validation = await this.validateTransaction(request);
    if (!validation.isValid) {
      throw new Error(`Transaction validation failed: ${validation.errors.join(', ')}`);
    }

    // Simulate transaction processing
    const transaction: TransactionResponse = {
      signature: 'simulated_' + Math.random().toString(36).substr(2, 9),
      status: 'confirmed',
      timestamp: new Date(),
      amount: request.amount,
      token: request.token,
      toAddress: request.toAddress,
      fromAddress: request.walletAddress,
      fee: request.amount * 0.001 // 0.1% fee
    };

    // Update daily volume
    const currentVolume = this.dailyTransactionVolume.get(request.walletAddress) || 0;
    this.dailyTransactionVolume.set(request.walletAddress, currentVolume + request.amount);

    // Add to transaction history
    const history = this.transactionHistory.get(request.walletAddress) || [];
    history.push(transaction);
    this.transactionHistory.set(request.walletAddress, history);

    // Log transaction for audit
    auditLogger.logTransaction(
      request.walletAddress,
      'send',
      {
        amount: request.amount,
        token: request.token,
        toAddress: request.toAddress,
        signature: transaction.signature,
        fee: transaction.fee
      }
    );

    return transaction;
  }

  /**
   * Process deposit (client-side simulation)
   */
  async processDeposit(request: DepositRequest): Promise<TransactionResponse> {
    // Check rate limit
    if (!await this.checkRateLimit('transactions')) {
      throw new Error('Rate limit exceeded for transactions');
    }

    // Simulate deposit processing
    const transaction: TransactionResponse = {
      signature: 'deposit_' + Math.random().toString(36).substr(2, 9),
      status: 'confirmed',
      timestamp: new Date(),
      amount: request.amount,
      token: request.token,
      toAddress: request.walletAddress,
      fromAddress: 'external_deposit',
      fee: 0 // No fee for deposits
    };

    // Add to transaction history
    const history = this.transactionHistory.get(request.walletAddress) || [];
    history.push(transaction);
    this.transactionHistory.set(request.walletAddress, history);

    // Log deposit for audit
    auditLogger.logTransaction(
      request.walletAddress,
      'deposit',
      {
        amount: request.amount,
        token: request.token,
        signature: transaction.signature
      }
    );

    return transaction;
  }

  /**
   * Process withdrawal (client-side simulation)
   */
  async processWithdrawal(request: WithdrawalRequest): Promise<TransactionResponse> {
    // Check rate limit
    if (!await this.checkRateLimit('transactions')) {
      throw new Error('Rate limit exceeded for transactions');
    }

    // Validate withdrawal
    const validation = await this.validateTransaction({
      toAddress: request.toAddress,
      amount: request.amount,
      token: request.token,
      walletAddress: request.walletAddress,
      twoFactorCode: request.twoFactorCode
    });

    if (!validation.isValid) {
      throw new Error(`Withdrawal validation failed: ${validation.errors.join(', ')}`);
    }

    // Simulate withdrawal processing
    const transaction: TransactionResponse = {
      signature: 'withdrawal_' + Math.random().toString(36).substr(2, 9),
      status: 'confirmed',
      timestamp: new Date(),
      amount: request.amount,
      token: request.token,
      toAddress: request.toAddress,
      fromAddress: request.walletAddress,
      fee: request.amount * 0.002 // 0.2% withdrawal fee
    };

    // Update daily volume
    const currentVolume = this.dailyTransactionVolume.get(request.walletAddress) || 0;
    this.dailyTransactionVolume.set(request.walletAddress, currentVolume + request.amount);

    // Add to transaction history
    const history = this.transactionHistory.get(request.walletAddress) || [];
    history.push(transaction);
    this.transactionHistory.set(request.walletAddress, history);

    // Log withdrawal for audit
    auditLogger.logTransaction(
      request.walletAddress,
      'withdrawal',
      {
        amount: request.amount,
        token: request.token,
        toAddress: request.toAddress,
        signature: transaction.signature,
        fee: transaction.fee
      }
    );

    return transaction;
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(walletAddress: string, _limit: number = 50): Promise<TransactionResponse[]> {
    const history = this.transactionHistory.get(walletAddress) || [];
    return history.slice(-_limit).reverse(); // Return most recent first
  }

  /**
   * Get transaction by signature
   */
  async getTransaction(signature: string): Promise<TransactionResponse | null> {
    for (const [walletAddress, history] of this.transactionHistory.entries()) {
      const transaction = history.find(tx => tx.signature === signature);
      if (transaction) {
        return transaction;
      }
    }
    return null;
  }
}

// Export singleton instance for client-side use
export const clientCryptoApiService = new ClientCryptoApiService();