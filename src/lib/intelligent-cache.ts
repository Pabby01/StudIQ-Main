/**
 * Intelligent Cache Service
 * Provides caching with TTL, LRU eviction, and smart invalidation
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
}

export class IntelligentCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private config: CacheConfig) {
    this.startCleanupTimer();
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  async set(key: string, data: T, ttl?: number): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.config.defaultTTL
    };

    // Check if we need to evict old entries
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.cache.clear();
  }
}

// Create specific cache instances
export const priceCache = new IntelligentCache({
  maxSize: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  cleanupInterval: 60 * 1000 // 1 minute
});

export const userCache = new IntelligentCache({
  maxSize: 500,
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  cleanupInterval: 5 * 60 * 1000 // 5 minutes
});

export const transactionCache = new IntelligentCache({
  maxSize: 200,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 10 * 60 * 1000 // 10 minutes
});

export const intelligentCache = new IntelligentCache({
  maxSize: 2000,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  cleanupInterval: 2 * 60 * 1000 // 2 minutes
});

export default IntelligentCache;