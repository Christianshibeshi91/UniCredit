interface Bucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

const ENDPOINT_LIMITS: Record<string, { maxTokens: number; refillRate: number }> = {
  catalog: { maxTokens: 2, refillRate: 2 },
  pricing: { maxTokens: 10, refillRate: 10 },
  reviews: { maxTokens: 1, refillRate: 1 },
  bsr: { maxTokens: 5, refillRate: 5 },
  inventory: { maxTokens: 5, refillRate: 5 },
  fees: { maxTokens: 5, refillRate: 5 },
};

class RateLimiter {
  private buckets = new Map<string, Bucket>();

  private getBucket(endpoint: string): Bucket {
    if (!this.buckets.has(endpoint)) {
      const config = ENDPOINT_LIMITS[endpoint] ?? { maxTokens: 5, refillRate: 5 };
      this.buckets.set(endpoint, {
        tokens: config.maxTokens,
        lastRefill: Date.now(),
        maxTokens: config.maxTokens,
        refillRate: config.refillRate,
      });
    }
    return this.buckets.get(endpoint)!;
  }

  private refill(bucket: Bucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + elapsed * bucket.refillRate);
    bucket.lastRefill = now;
  }

  acquire(endpoint: string): boolean {
    const bucket = this.getBucket(endpoint);
    this.refill(bucket);
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    return false;
  }

  async waitForSlot(endpoint: string, maxWaitMs = 30000): Promise<void> {
    const start = Date.now();
    while (!this.acquire(endpoint)) {
      if (Date.now() - start > maxWaitMs) {
        throw new Error(`Rate limit timeout for ${endpoint} after ${maxWaitMs}ms`);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

export const rateLimiter = new RateLimiter();
