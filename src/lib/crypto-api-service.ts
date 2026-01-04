import { secureLogger } from './secure-logger';
import axios from 'axios';

// Inline Solana address validation
function normalizeWalletAddress(address: string): string {
  return address.trim()
}

function isValidSolanaAddress(address: string): boolean {
  return address.length >= 32 && address.length <= 44
}
import { auditLogger } from './audit-logger';
import { buildHeaders } from './client-database-utils';

// Rate limit result interface (duplicated to avoid import dependency)
export interface RateLimitResult {
  allowed: boolean;
  current: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

// Rate limiter interface for type safety
interface RateLimiterInstance {
  initialize(): Promise<void>;
  isAvailable(): boolean;
  consume(key: string): Promise<RateLimitResult>;
  getStatus(key: string): Promise<RateLimitResult>;
}

interface RateLimitersCollection {
  api: RateLimiterInstance;
  transactions: RateLimiterInstance;
  auth: RateLimiterInstance;
  prices: RateLimiterInstance;
}

// Conditional import for server-side only
let rateLimiters: RateLimitersCollection | null = null;

// Only import Redis rate limiter on server side
if (typeof window === 'undefined') {
  // Use dynamic import instead of require for better TypeScript support
  import('./redis-rate-limiter')
    .then((redisModule) => {
      rateLimiters = redisModule.rateLimiters;
    })
    .catch((error) => {
      secureLogger.warn('Redis rate limiter not available, running without rate limiting', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });
}

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

  // Rate limiting properties
  private rateLimitMax = 100; // Max requests per window
  private rateLimitWindow = 60; // Window in seconds (1 minute)
  private rateLimitMap: Map<string, number[]> = new Map(); // operation -> timestamps

  /**
   * Initialize the service with Redis rate limiting (server-side only)
   */
  async initialize(): Promise<void> {
    // Only initialize Redis rate limiting on server side
    if (rateLimiters) {
      try {
        await rateLimiters.api.initialize();
        await rateLimiters.transactions.initialize();
        await rateLimiters.auth.initialize();
        await rateLimiters.prices.initialize();

        secureLogger.info('Crypto API service initialized with Redis rate limiting');
      } catch (error) {
        secureLogger.error('Failed to initialize Redis rate limiting', error);
        // Continue with in-memory rate limiting as fallback
        secureLogger.info('Falling back to in-memory rate limiting');
      }
    } else {
      // Client-side: no Redis rate limiting needed
      secureLogger.info('Crypto API service initialized (client-side, no Redis rate limiting)');
    }
  }

  /**
   * Enhanced rate limiting with Redis fallback
   */
  private async checkRateLimit(operation: 'api' | 'transactions' | 'auth' | 'prices'): Promise<boolean> {
    try {
      // Try Redis rate limiter first (server-side only)
      if (rateLimiters) {
        const rateLimiter = rateLimiters[operation];
        if (rateLimiter.isAvailable()) {
          const result = await rateLimiter.consume(`${operation}:${this.getClientId()} `);

          if (!result.allowed) {
            secureLogger.warn('Rate limit exceeded', {
              operation,
              current: result.current,
              remaining: result.remaining,
              resetTime: result.resetTime
            });

            // Log rate limit violation for audit
            auditLogger.logRateLimitViolation({
              userId: this.getClientId(),
              action: operation,
              violationType: 'rate_limit_exceeded',
              timestamp: Date.now(),
              details: {
                limit: result.current + result.remaining,
                current: result.current,
                resetTime: result.resetTime
              }
            });
          }

          return result.allowed;
        }
      }

      // Fallback to in-memory rate limiting
      return this.checkInMemoryRateLimit(operation);
    } catch (error) {
      secureLogger.error('Rate limit check failed, allowing request', { error, operation });
      return true; // Allow request on error
    }
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientId(): string {
    // Use IP address or user ID if available
    // For now, use a simple identifier
    return 'client_' + (typeof window !== 'undefined' ? 'browser' : 'server');
  }

  /**
   * Get rate limit status for an operation
   */
  async getRateLimitStatus(operation: 'api' | 'transactions' | 'auth' | 'prices'): Promise<RateLimitResult> {
    try {
      // Try Redis rate limiter first (server-side only)
      if (rateLimiters) {
        const rateLimiter = rateLimiters[operation];
        if (rateLimiter.isAvailable()) {
          return await rateLimiter.getStatus(`${operation}:${this.getClientId()} `);
        }
      }

      // Fallback to in-memory status
      return this.getInMemoryRateLimitStatus(operation);
    } catch (error) {
      secureLogger.error('Failed to get rate limit status', { error, operation });
      return {
        allowed: true,
        current: 0,
        remaining: this.rateLimitMax,
        resetTime: new Date(Date.now() + this.rateLimitWindow * 1000)
      };
    }
  }

  /**
   * In-memory rate limiting fallback
   */
  private checkInMemoryRateLimit(operation: string): boolean {
    const now = Date.now();
    const key = `rate_limit_${operation} `;
    const windowMs = this.rateLimitWindow * 1000;

    if (!this.rateLimitMap.has(key)) {
      this.rateLimitMap.set(key, []);
    }

    const timestamps = this.rateLimitMap.get(key)!;

    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter(timestamp => now - timestamp < windowMs);

    if (validTimestamps.length >= this.rateLimitMax) {
      const oldestRequest = Math.min(...validTimestamps);
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      secureLogger.warn('In-memory rate limit exceeded', {
        operation,
        currentRequests: validTimestamps.length,
        maxRequests: this.rateLimitMax,
        retryAfterSeconds: retryAfter
      });
      return false;
    }

    // Add current timestamp
    validTimestamps.push(now);
    this.rateLimitMap.set(key, validTimestamps);

    return true;
  }

  /**
   * Get in-memory rate limit status
   */
  private getInMemoryRateLimitStatus(operation: string): RateLimitResult {
    const key = `rate_limit_${operation} `;
    const now = Date.now();
    const windowMs = this.rateLimitWindow * 1000;

    if (!this.rateLimitMap.has(key)) {
      return {
        allowed: true,
        current: 0,
        remaining: this.rateLimitMax,
        resetTime: new Date(now + windowMs)
      };
    }

    const timestamps = this.rateLimitMap.get(key)!;
    const validTimestamps = timestamps.filter(timestamp => now - timestamp < windowMs);
    const currentRequests = validTimestamps.length;
    const resetTime = validTimestamps.length > 0
      ? new Date(Math.max(...validTimestamps) + windowMs)
      : new Date(now + windowMs);

    return {
      allowed: currentRequests < this.rateLimitMax,
      current: currentRequests,
      remaining: Math.max(0, this.rateLimitMax - currentRequests),
      resetTime
    };
  }

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
    // Price-specific rate limiting
    if (!await this.checkRateLimit('prices')) {
      throw new Error('Price API rate limit exceeded. Please try again later.');
    }

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
      const response = await fetch(`/ api / crypto / prices ? ids = ${ids}& vs_currencies=usd`, {
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
    // Price-specific rate limiting
    if (!await this.checkRateLimit('prices')) {
      throw new Error('Price API rate limit exceeded. Please try again later.');
    }

    const now = Date.now();
    const cached = this.marketCache.get(symbol.toLowerCase());

    if (cached && now - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Use our proxy API route to avoid CORS and rate limiting issues
      const response = await fetch(`/ api / crypto / market - data ? symbol = ${symbol} `, {
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

  // Enhanced send transaction with comprehensive validation
  async sendTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    try {
      // Rate limiting check
      if (!await this.checkRateLimit('transactions')) {
        throw new Error('Transaction rate limit exceeded. Please try again later.');
      }

      // Comprehensive transaction validation
      const validationResult = await this.validateTransaction(request);
      if (!validationResult.isValid) {
        const errorMessage = validationResult.errors.join('; ');
        secureLogger.warn('Transaction validation failed', {
          request,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        });
        // Log validation failure for audit
        auditLogger.logValidationViolation({
          userId: request.walletAddress,
          walletAddress: request.walletAddress,
          action: 'send_transaction',
          violationType: 'validation_failed',
          details: {
            validationErrors: validationResult.errors,
            validationWarnings: validationResult.warnings
          }
        });
        throw new Error(`Transaction validation failed: ${errorMessage} `);
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        secureLogger.warn('Transaction validation warnings', {
          request,
          warnings: validationResult.warnings
        });
      }

      const response = await fetch('/api/transactions/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Transaction failed');
      }

      const result = await response.json();
      const transactionResponse: TransactionResponse = {
        ...result,
        timestamp: new Date(result.timestamp),
      };

      // Update transaction tracking
      this.updateDailyTransactionVolume(request.walletAddress, request.amount);
      this.addTransactionToHistory(transactionResponse);

      secureLogger.info('Transaction sent successfully', {
        transactionId: transactionResponse.signature,
        fromAddress: transactionResponse.fromAddress,
        toAddress: transactionResponse.toAddress,
        amount: transactionResponse.amount,
        token: transactionResponse.token
      });

      // Log successful transaction for audit
      auditLogger.logTransaction(request.walletAddress, 'transaction_sent', {
        transactionHash: transactionResponse.signature,
        amount: request.amount,
        token: request.token,
        destination: request.toAddress,
        fee: transactionResponse.fee
      });

      return transactionResponse;
    } catch (error) {
      secureLogger.error('Send transaction error', { error, request });
      throw error;
    }
  }

  // Enhanced process deposit with validation
  async processDeposit(request: DepositRequest): Promise<TransactionResponse> {
    try {
      // Rate limiting check
      if (!await this.checkRateLimit('transactions')) {
        throw new Error('Transaction rate limit exceeded. Please try again later.');
      }

      // Validate wallet address
      if (!request.walletAddress) {
        throw new Error('Wallet address is required');
      }
      if (!isValidSolanaAddress(request.walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      // Validate amount
      if (request.amount <= 0) {
        throw new Error('Amount must be greater than zero');
      }
      if (request.amount < this.MIN_TRANSACTION_AMOUNT) {
        throw new Error(`Amount must be at least ${this.MIN_TRANSACTION_AMOUNT} `);
      }
      if (request.amount > this.MAX_TRANSACTION_AMOUNT) {
        throw new Error(`Amount exceeds maximum limit of ${this.MAX_TRANSACTION_AMOUNT} `);
      }

      // Validate token
      if (!request.token) {
        throw new Error('Token is required');
      }
      if (!this.SUPPORTED_TOKENS.includes(request.token.toUpperCase())) {
        throw new Error(`Unsupported token: ${request.token}. Supported tokens: ${this.SUPPORTED_TOKENS.join(', ')} `);
      }

      const response = await fetch('/api/transactions/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Deposit failed');
      }

      const result = await response.json();
      const transactionResponse: TransactionResponse = {
        ...result,
        timestamp: new Date(result.timestamp),
      };

      // Update transaction tracking
      this.updateDailyTransactionVolume(request.walletAddress, request.amount);
      this.addTransactionToHistory(transactionResponse);

      secureLogger.info('Deposit processed successfully', {
        transactionId: transactionResponse.signature,
        walletAddress: request.walletAddress,
        amount: request.amount,
        token: request.token
      });

      return transactionResponse;
    } catch (error) {
      secureLogger.error('Deposit failed', error);

      // Log deposit failure for audit
      auditLogger.logTransaction(request.walletAddress, 'deposit_failed', {
        error: error instanceof Error ? error.message : String(error),
        amount: request.amount,
        token: request.token
      });

      throw error;
    }
  }

  // Enhanced process withdrawal with validation
  async processWithdrawal(request: WithdrawalRequest): Promise<TransactionResponse> {
    try {
      // Rate limiting check
      if (!await this.checkRateLimit('transactions')) {
        throw new Error('Transaction rate limit exceeded. Please try again later.');
      }

      // Validate wallet address
      if (!request.walletAddress) {
        throw new Error('Wallet address is required');
      }
      if (!isValidSolanaAddress(request.walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      // Validate destination address
      if (!request.toAddress) {
        throw new Error('Destination address is required');
      }
      if (!isValidSolanaAddress(request.toAddress)) {
        throw new Error('Invalid destination wallet address format');
      }

      // Prevent self-transfers
      if (request.walletAddress === request.toAddress) {
        throw new Error('Cannot withdraw to your own wallet address');
      }

      // Validate amount
      if (request.amount <= 0) {
        throw new Error('Amount must be greater than zero');
      }
      if (request.amount < this.MIN_TRANSACTION_AMOUNT) {
        throw new Error(`Amount must be at least ${this.MIN_TRANSACTION_AMOUNT} `);
      }
      if (request.amount > this.MAX_TRANSACTION_AMOUNT) {
        throw new Error(`Amount exceeds maximum limit of ${this.MAX_TRANSACTION_AMOUNT} `);
      }

      // Validate token
      if (!request.token) {
        throw new Error('Token is required');
      }
      if (!this.SUPPORTED_TOKENS.includes(request.token.toUpperCase())) {
        throw new Error(`Unsupported token: ${request.token}. Supported tokens: ${this.SUPPORTED_TOKENS.join(', ')} `);
      }

      // Check daily limits
      const dailyVolume = this.getDailyTransactionVolume(request.walletAddress);
      const projectedVolume = dailyVolume + request.amount;
      if (projectedVolume > this.DAILY_TRANSACTION_LIMIT) {
        throw new Error(`Daily transaction limit exceeded.Current: ${dailyVolume}, Limit: ${this.DAILY_TRANSACTION_LIMIT} `);
      }

      const response = await fetch('/api/transactions/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Withdrawal failed');
      }

      const result = await response.json();
      const transactionResponse: TransactionResponse = {
        ...result,
        timestamp: new Date(result.timestamp),
      };

      // Update transaction tracking
      this.updateDailyTransactionVolume(request.walletAddress, request.amount);
      this.addTransactionToHistory(transactionResponse);

      secureLogger.info('Withdrawal processed successfully', {
        transactionId: transactionResponse.signature,
        walletAddress: request.walletAddress,
        destinationAddress: request.toAddress,
        amount: request.amount,
        token: request.token
      });

      return transactionResponse;
    } catch (error) {
      secureLogger.error('Withdrawal failed', error);

      // Log withdrawal failure for audit
      auditLogger.logTransaction(request.walletAddress, 'withdrawal_failed', {
        error: error instanceof Error ? error.message : String(error),
        amount: request.amount,
        token: request.token,
        destination: request.toAddress
      });

      throw error;
    }
  }

  // Get transaction history
  async getTransactionHistory(walletAddress: string, limit: number = 50): Promise<TransactionResponse[]> {
    try {
      // Validate wallet address
      if (!walletAddress) {
        throw new Error('Wallet address is required');
      }
      if (!isValidSolanaAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      const response = await fetch(`/ api / transactions / history ? walletAddress = ${walletAddress}& limit=${limit} `, {
        headers: {
          ...buildHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }

      const result = await response.json();
      const transactions = result.map((tx: TransactionResponse) => ({
        ...tx,
        timestamp: new Date(tx.timestamp),
      }));

      secureLogger.info('Transaction history retrieved', {
        walletAddress,
        transactionCount: transactions.length,
        limit
      });

      return transactions;
    } catch (error) {
      secureLogger.error('Failed to fetch transaction history', error);
      throw error;
    }
  }

  // Get transaction status
  async getTransactionStatus(txHash: string): Promise<TransactionResponse> {
    try {
      if (!txHash) {
        throw new Error('Transaction hash is required');
      }

      const response = await fetch(`/ api / transactions / status / ${txHash} `, {
        headers: {
          ...buildHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transaction status');
      }

      const result = await response.json();
      const transaction: TransactionResponse = {
        ...result,
        timestamp: new Date(result.timestamp)
      };

      secureLogger.info('Transaction status retrieved', {
        txHash,
        status: transaction.status,
        fromAddress: transaction.fromAddress,
        toAddress: transaction.toAddress
      });

      return transaction;
    } catch (error) {
      secureLogger.error('Failed to fetch transaction status', error);
      throw error;
    }
  }

  // Get transaction limits for a wallet
  async getWalletLimits(walletAddress: string): Promise<TransactionLimits> {
    try {
      if (!walletAddress) {
        throw new Error('Wallet address is required');
      }
      if (!isValidSolanaAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      const limits = this.getTransactionLimits(walletAddress);

      secureLogger.info('Wallet limits retrieved', {
        walletAddress,
        limits
      });

      return limits;
    } catch (error) {
      secureLogger.error('Get wallet limits error', { error, walletAddress });
      throw error;
    }
  }

  // Cancel pending transaction
  async cancelTransaction(txHash: string, walletAddress: string): Promise<boolean> {
    try {
      if (!txHash) {
        throw new Error('Transaction hash is required');
      }
      if (!walletAddress) {
        throw new Error('Wallet address is required');
      }
      if (!isValidSolanaAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      const response = await fetch('/api/transactions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(),
        },
        body: JSON.stringify({ txHash, walletAddress }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel transaction');
      }

      const result = await response.json();
      const success = result.success || false;

      secureLogger.info('Transaction cancellation attempted', {
        txHash,
        walletAddress,
        success
      });

      return success;
    } catch (error) {
      secureLogger.error('Cancel transaction error', { error, txHash, walletAddress });
      throw error;
    }
  }

  // Get transaction statistics for a wallet
  async getTransactionStats(walletAddress: string): Promise<{
    totalTransactions: number;
    totalVolume: number;
    averageTransactionSize: number;
    recentTransactions: number;
  }> {
    try {
      if (!walletAddress) {
        throw new Error('Wallet address is required');
      }
      if (!isValidSolanaAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      const transactions = this.getRecentTransactions(walletAddress, 100);
      const totalTransactions = transactions.length;
      const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      const averageTransactionSize = totalTransactions > 0 ? totalVolume / totalTransactions : 0;
      const recentTransactions = transactions.filter(tx =>
        (Date.now() - tx.timestamp.getTime()) < 24 * 60 * 60 * 1000 // Last 24 hours
      ).length;

      const stats = {
        totalTransactions,
        totalVolume,
        averageTransactionSize,
        recentTransactions
      };

      secureLogger.info('Transaction statistics retrieved', {
        walletAddress,
        stats
      });

      return stats;
    } catch (error) {
      secureLogger.error('Get transaction stats error', { error, walletAddress });
      throw error;
    }
  }

  // Get exchange rates
  async getExchangeRates(fromSymbol: string, toSymbol: string): Promise<number> {
    try {
      const response = await fetch(
        `${this.BASE_URL} /simple/price ? ids = ${fromSymbol.toLowerCase()}& vs_currencies=${toSymbol.toLowerCase()} `
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

  // Comprehensive transaction validation
  async validateTransaction(request: TransactionRequest): Promise<TransactionValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate wallet addresses
      if (!request.walletAddress) {
        errors.push('Source wallet address is required');
        auditLogger.logValidationViolation({
          userId: request.walletAddress,
          walletAddress: request.walletAddress,
          action: 'validate_transaction',
          violationType: 'validation_failed',
          details: {
            field: 'walletAddress',
            value: request.walletAddress,
            rule: 'valid_solana_address'
          }
        });
      } else if (!isValidSolanaAddress(request.walletAddress)) {
        errors.push('Invalid source wallet address format');
        auditLogger.logValidationViolation({
          userId: request.walletAddress,
          walletAddress: request.walletAddress,
          action: 'validate_transaction',
          violationType: 'validation_failed',
          details: {
            field: 'walletAddress',
            value: request.walletAddress,
            rule: 'valid_solana_address'
          }
        });
      }

      if (!request.toAddress) {
        errors.push('Destination address is required');
        auditLogger.logValidationViolation({
          userId: request.walletAddress,
          walletAddress: request.toAddress,
          action: 'validate_transaction',
          violationType: 'validation_failed',
          details: {
            field: 'toAddress',
            value: request.toAddress,
            rule: 'valid_solana_address'
          }
        });
      } else if (!isValidSolanaAddress(request.toAddress)) {
        errors.push('Invalid destination wallet address format');
        auditLogger.logValidationViolation({
          userId: request.walletAddress,
          walletAddress: request.toAddress,
          action: 'validate_transaction',
          violationType: 'validation_failed',
          details: {
            field: 'toAddress',
            value: request.toAddress,
            rule: 'valid_solana_address'
          }
        });
      }

      // Prevent self-transfers
      if (request.walletAddress && request.toAddress && request.walletAddress === request.toAddress) {
        errors.push('Cannot send to your own wallet address');
        auditLogger.logValidationViolation({
          userId: request.walletAddress,
          walletAddress: request.walletAddress,
          action: 'validate_transaction',
          violationType: 'validation_failed',
          details: {
            field: 'toAddress',
            value: request.toAddress,
            rule: 'no_self_transfer'
          }
        });
      }

      // Validate amount
      if (request.amount <= 0) {
        errors.push('Amount must be greater than zero');
      } else if (request.amount < this.MIN_TRANSACTION_AMOUNT) {
        errors.push(`Amount must be at least ${this.MIN_TRANSACTION_AMOUNT} `);
      } else if (request.amount > this.MAX_TRANSACTION_AMOUNT) {
        errors.push(`Amount exceeds maximum limit of ${this.MAX_TRANSACTION_AMOUNT} `);
      }

      // Validate token
      if (!request.token) {
        errors.push('Token is required');
      } else if (!this.SUPPORTED_TOKENS.includes(request.token.toUpperCase())) {
        errors.push(`Unsupported token: ${request.token}. Supported tokens: ${this.SUPPORTED_TOKENS.join(', ')} `);
      }

      // Check daily limits
      const dailyVolume = this.getDailyTransactionVolume(request.walletAddress);
      const projectedVolume = dailyVolume + request.amount;
      if (projectedVolume > this.DAILY_TRANSACTION_LIMIT) {
        errors.push(`Daily transaction limit exceeded.Current: ${dailyVolume}, Limit: ${this.DAILY_TRANSACTION_LIMIT} `);
      }

      // Check for suspicious patterns
      if (request.amount > this.MAX_TRANSACTION_AMOUNT * 0.8) {
        warnings.push('Large transaction amount detected - additional verification may be required');
      }

      // Validate 2FA if amount is significant
      if (request.amount > 1000 && !request.twoFactorCode) {
        warnings.push('Consider enabling 2FA for transactions over $1000');
      }

      // Check recent transaction history for duplicate requests
      const recentTransactions = this.getRecentTransactions(request.walletAddress, 5);
      const duplicateTransaction = recentTransactions.find(tx =>
        tx.toAddress === request.toAddress &&
        Math.abs(tx.amount - request.amount) < 0.001 &&
        (Date.now() - tx.timestamp.getTime()) < 60000 // Within 1 minute
      );

      if (duplicateTransaction) {
        warnings.push('Similar transaction detected within the last minute - this may be a duplicate');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      secureLogger.error('Transaction validation error', { error, request });
      return {
        isValid: false,
        errors: ['Transaction validation failed'],
        warnings: []
      };
    }
  }

  // Get transaction limits for a wallet
  getTransactionLimits(walletAddress: string): TransactionLimits {
    const dailyVolume = this.getDailyTransactionVolume(walletAddress);
    const remainingLimit = Math.max(0, this.DAILY_TRANSACTION_LIMIT - dailyVolume);

    return {
      minAmount: this.MIN_TRANSACTION_AMOUNT,
      maxAmount: Math.min(this.MAX_TRANSACTION_AMOUNT, remainingLimit),
      dailyLimit: this.DAILY_TRANSACTION_LIMIT,
      requiresVerification: dailyVolume > this.DAILY_TRANSACTION_LIMIT * 0.8
    };
  }

  // Get daily transaction volume for a wallet
  private getDailyTransactionVolume(walletAddress: string): number {
    const volume = this.dailyTransactionVolume.get(walletAddress) || 0;
    return volume;
  }

  // Update daily transaction volume
  private updateDailyTransactionVolume(walletAddress: string, amount: number): void {
    const currentVolume = this.getDailyTransactionVolume(walletAddress);
    this.dailyTransactionVolume.set(walletAddress, currentVolume + amount);
  }

  // Get recent transactions for a wallet
  private getRecentTransactions(walletAddress: string, limit: number = 10): TransactionResponse[] {
    const transactions = this.transactionHistory.get(walletAddress) || [];
    return transactions.slice(-limit);
  }

  // Add transaction to history
  private addTransactionToHistory(transaction: TransactionResponse): void {
    const walletAddress = transaction.fromAddress;
    const transactions = this.transactionHistory.get(walletAddress) || [];
    transactions.push(transaction);

    // Keep only last 100 transactions per wallet
    if (transactions.length > 100) {
      transactions.shift();
    }

    this.transactionHistory.set(walletAddress, transactions);
  }

  // Enhanced wallet address validation
  validateWalletAddress(address: string, blockchain: string): boolean {
    // Solana-only wallet validation
    if (blockchain.toLowerCase() !== 'solana') {
      return false;
    }
    return isValidSolanaAddress(address);
  }

  // Reset daily transaction limits (useful for testing or admin operations)
  resetDailyLimits(walletAddress?: string): void {
    try {
      if (walletAddress) {
        this.dailyTransactionVolume.delete(walletAddress);
        secureLogger.info('Daily limits reset for wallet', { walletAddress });
      } else {
        this.dailyTransactionVolume.clear();
        secureLogger.info('All daily limits reset');
      }
    } catch (error) {
      secureLogger.error('Failed to reset daily limits', { error, walletAddress });
      throw error;
    }
  }



  // Clear cache and reset state
  clearCache(): void {
    try {
      this.priceCache.clear();
      this.marketCache.clear();
      this.requestQueue = [];
      this.isProcessingQueue = false;
      secureLogger.info('Cache and queue cleared');
    } catch (error) {
      secureLogger.error('Failed to clear cache', { error });
      throw error;
    }
  }
}

// Create singleton instance
export const cryptoApiService = new CryptoApiService();

// Export types for use in components