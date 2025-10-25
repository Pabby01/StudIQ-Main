/**
 * Redis-based Rate Limiter
 * Provides scalable, distributed rate limiting using Redis
 */

import { createClient, RedisClientType } from 'redis';
import { secureLogger } from './secure-logger';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export class RedisRateLimiter {
  private client: RedisClientType | null = null;
  private connected = false;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'rate_limit:',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    };
  }

  /**
   * Initialize Redis connection
   */
  async initialize(): Promise<void> {
    try {
      // Check if Redis URL is configured
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
      if (!redisUrl) {
        secureLogger.warn('Redis URL not configured, rate limiting will use in-memory fallback');
        return;
      }

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries: number) => Math.min(retries * 50, 500),
          connectTimeout: 10000,
          keepAlive: true
        },
        pingInterval: 30000
      });

      this.client.on('error', (err: Error) => {
        secureLogger.error('Redis client error', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        secureLogger.info('Redis client connected');
        this.connected = true;
      });

      this.client.on('disconnect', () => {
        secureLogger.warn('Redis client disconnected');
        this.connected = false;
      });

      await this.client.connect();
      secureLogger.info('Redis rate limiter initialized successfully');
    } catch (error) {
      secureLogger.error('Failed to initialize Redis rate limiter', error);
      this.connected = false;
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.connected && this.client !== null;
  }

  /**
   * Check rate limit for a specific key
   */
  async checkLimit(key: string): Promise<RateLimitResult> {
    const fullKey = `${this.config.keyPrefix}${key}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      if (!this.isAvailable()) {
        return this.getFallbackLimitResult();
      }

      // Use Redis pipeline for atomic operations
      const pipeline = this.client!.multi();
      
      // Remove expired entries
      pipeline.zRemRangeByScore(fullKey, 0, windowStart);
      
      // Count current requests
      pipeline.zCard(fullKey);
      
      // Add current request
      pipeline.zAdd(fullKey, { score: now, value: now.toString() });
      
      // Set expiration
      pipeline.expire(fullKey, Math.ceil(this.config.windowMs / 1000));

      const results = await pipeline.exec();
      
      if (!results || results.length < 2) {
        throw new Error('Redis pipeline failed');
      }

      const currentRequests = Number(results[1]);
      const allowed = currentRequests < this.config.maxRequests;
      const remaining = Math.max(0, this.config.maxRequests - currentRequests);
      const resetTime = new Date(now + this.config.windowMs);

      const result: RateLimitResult = {
        allowed,
        current: currentRequests,
        remaining,
        resetTime,
        retryAfter: allowed ? undefined : Math.ceil(this.config.windowMs / 1000)
      };

      secureLogger.debug('Rate limit check', {
        key: fullKey,
        allowed,
        current: currentRequests,
        remaining,
        maxRequests: this.config.maxRequests
      });

      return result;
    } catch (error) {
      secureLogger.error('Rate limit check failed', { error, key: fullKey });
      return this.getFallbackLimitResult();
    }
  }

  /**
   * Consume a request from the rate limit
   */
  async consume(key: string): Promise<RateLimitResult> {
    return this.checkLimit(key);
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetLimit(key: string): Promise<void> {
    const fullKey = `${this.config.keyPrefix}${key}`;

    try {
      if (!this.isAvailable()) {
        return;
      }

      await this.client!.del(fullKey);
      secureLogger.info('Rate limit reset', { key: fullKey });
    } catch (error) {
      secureLogger.error('Failed to reset rate limit', { error, key: fullKey });
    }
  }

  /**
   * Get current rate limit status without consuming a request
   */
  async getStatus(key: string): Promise<RateLimitResult> {
    const fullKey = `${this.config.keyPrefix}${key}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      if (!this.isAvailable()) {
        return this.getFallbackLimitResult();
      }

      // Remove expired entries and count
      await this.client!.zRemRangeByScore(fullKey, 0, windowStart);
      const currentRequests = await this.client!.zCard(fullKey);
      
      const allowed = currentRequests < this.config.maxRequests;
      const remaining = Math.max(0, this.config.maxRequests - currentRequests);
      const resetTime = new Date(now + this.config.windowMs);

      return {
        allowed,
        current: currentRequests,
        remaining,
        resetTime,
        retryAfter: allowed ? undefined : Math.ceil(this.config.windowMs / 1000)
      };
    } catch (error) {
      secureLogger.error('Failed to get rate limit status', { error, key: fullKey });
      return this.getFallbackLimitResult();
    }
  }

  /**
   * Get multiple rate limit statuses
   */
  async getMultipleStatuses(keys: string[]): Promise<Map<string, RateLimitResult>> {
    const results = new Map<string, RateLimitResult>();
    
    for (const key of keys) {
      results.set(key, await this.getStatus(key));
    }
    
    return results;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.connected = false;
        secureLogger.info('Redis rate limiter closed');
      }
    } catch (error) {
      secureLogger.error('Error closing Redis rate limiter', error);
    }
  }

  /**
   * Get fallback result when Redis is unavailable
   */
  private getFallbackLimitResult(): RateLimitResult {
    return {
      allowed: true,
      current: 0,
      remaining: this.config.maxRequests,
      resetTime: new Date(Date.now() + this.config.windowMs)
    };
  }
}

/**
 * Create rate limiter instances for different operations
 */
export const createRateLimiters = () => ({
  // General API rate limiting
  api: new RedisRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'api:'
  }),

  // Transaction-specific rate limiting
  transactions: new RedisRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'tx:'
  }),

  // Authentication rate limiting
  auth: new RedisRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyPrefix: 'auth:'
  }),

  // Price API rate limiting
  prices: new RedisRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyPrefix: 'price:'
  })
});

export type RateLimiters = ReturnType<typeof createRateLimiters>;

// Export singleton instance
export const rateLimiters = createRateLimiters();