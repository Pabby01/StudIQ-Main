export async function rateLimit(_key: string, _limit: number, _windowMs: number) {
  return { allowed: true, remaining: _limit, resetTime: Date.now() + _windowMs };
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
  async consume(_key: string) {
    return { allowed: true, current: 0, remaining: 100, resetTime: new Date() };
  },
  async getStatus(_key: string) {
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
