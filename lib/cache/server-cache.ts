/**
 * ServerMemoryCache
 * Process-scoped in-memory cache for cross-navigation server-side caching.
 *
 * Guarantees:
 * 1. Multi-tenant isolation: All keys MUST be strictly identity-scoped (user:{id}, account:{id}, etc.).
 * 2. Automatic TTL expiry.
 * 3. Targeted invalidation by key, prefix, user, account, or workspace.
 * 4. Preserved across module re-evaluations via globalThis.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class ServerMemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxEntries: number;

  constructor(maxEntries = 5000) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = 60_000): void {
    // If over limit, evict oldest 10%
    if (this.store.size >= this.maxEntries) {
      const keysToDelete = Array.from(this.store.keys()).slice(0, Math.floor(this.maxEntries * 0.1));
      for (const k of keysToDelete) {
        this.store.delete(k);
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  invalidateUser(userId: string): number {
    return this.invalidatePrefix(`user:${userId}:`);
  }

  invalidateAccount(accountId: string): number {
    return this.invalidatePrefix(`account:${accountId}:`);
  }

  invalidatePlan(planId: string): number {
    return this.invalidatePrefix(`plan:${planId}:`);
  }

  invalidateWorkspace(workspaceId: string): number {
    return this.invalidatePrefix(`workspace:${workspaceId}:`);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

// Preserve instance across Next.js hot module reloads in development
const globalForCache = globalThis as unknown as {
  __pl_server_memory_cache?: ServerMemoryCache;
};

export const serverCache = globalForCache.__pl_server_memory_cache ?? new ServerMemoryCache();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.__pl_server_memory_cache = serverCache;
}
