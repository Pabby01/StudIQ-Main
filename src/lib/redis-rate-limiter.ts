export async function rateLimit(key: string, limit: number, windowMs: number) {
  void key;
  return { allowed: true, remaining: limit, resetTime: Date.now() + windowMs };
}

type RateLimitResult = { allowed: boolean; current: number; remaining: number; resetTime: Date; retryAfter?: number };
interface RateLimiterInstance {
  initialize(): Promise<void>;
  isAvailable(): boolean;
  consume(key: string): Promise<RateLimitResult>;
  getStatus(key: string): Promise<RateLimitResult>;
}

const makeLimiter = (): RateLimiterInstance => ({
  async initialize() {},
  isAvailable() {
    return false;
  },
  async consume(key: string) {
    void key;
    return { allowed: true, current: 0, remaining: 100, resetTime: new Date() };
  },
  async getStatus(key: string) {
    void key;
    return { allowed: true, current: 0, remaining: 100, resetTime: new Date() };
  },
});

export const rateLimiters: { api: RateLimiterInstance; transactions: RateLimiterInstance; auth: RateLimiterInstance; prices: RateLimiterInstance } = {
  api: makeLimiter(),
  transactions: makeLimiter(),
  auth: makeLimiter(),
  prices: makeLimiter(),
};

export default rateLimit;
