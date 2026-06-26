// file: packages\server\src\middleware\rate-limit-store.ts

export interface IRateLimitBucket {
  count: number;
  resetsAt: number;
}

export interface IRateLimitStore {
  incr(key: string, windowMs: number): Promise<IRateLimitBucket> | IRateLimitBucket;
  reset(key: string): Promise<void> | void;
  resetAll(): Promise<void> | void;
}

interface IBucketEntry extends IRateLimitBucket {
  windowStart: number;
}

export class InMemoryRateLimitStore implements IRateLimitStore {
  private readonly buckets = new Map<string, IBucketEntry>();

  incr(key: string, windowMs: number): IRateLimitBucket {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const resetsAt = windowStart + windowMs;

    const existing = this.buckets.get(key);
    if (!existing || existing.windowStart !== windowStart) {
      const entry: IBucketEntry = { count: 1, windowStart, resetsAt };
      this.buckets.set(key, entry);
      return { count: entry.count, resetsAt: entry.resetsAt };
    }

    existing.count += 1;
    return { count: existing.count, resetsAt: existing.resetsAt };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  resetAll(): void {
    this.buckets.clear();
  }
}