interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

class SPAPICache {
  private store = new Map<string, CacheEntry<unknown>>();
  private readonly maxEntries = 500;

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    entry.lastAccessed = Date.now();
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    // LRU eviction
    if (this.store.size >= this.maxEntries) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.store) {
        if (v.lastAccessed < oldestTime) {
          oldestTime = v.lastAccessed;
          oldestKey = k;
        }
      }
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      lastAccessed: Date.now(),
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const spapiCache = new SPAPICache();
