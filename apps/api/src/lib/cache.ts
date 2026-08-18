import { env } from './env.js';

/**
 * Cache abstraction (Phase 12).
 * Uses Redis when REDIS_URL is configured; otherwise an in-process TTL map so
 * the platform runs with zero external services in dev/CI. The public surface
 * is identical, so route code never branches on the backend.
 */
export interface CacheDriver {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  delPrefix(prefix: string): Promise<void>;
  incr(key: string, ttlSeconds: number): Promise<number>;
  readonly name: string;
}

class MemoryCache implements CacheDriver {
  readonly name = 'memory';
  private store = new Map<string, { value: unknown; expires: number }>();
  private counters = new Map<string, { count: number; expires: number }>();

  private sweep() {
    const now = Date.now();
    if (this.store.size > 5000) {
      for (const [k, v] of this.store) if (v.expires < now) this.store.delete(k);
    }
    if (this.counters.size > 20000) {
      for (const [k, v] of this.counters) if (v.expires < now) this.counters.delete(k);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (hit.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return hit.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.sweep();
    this.store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delPrefix(prefix: string): Promise<void> {
    for (const k of this.store.keys()) if (k.startsWith(prefix)) this.store.delete(k);
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    this.sweep();
    const now = Date.now();
    const hit = this.counters.get(key);
    if (!hit || hit.expires < now) {
      this.counters.set(key, { count: 1, expires: now + ttlSeconds * 1000 });
      return 1;
    }
    hit.count += 1;
    return hit.count;
  }
}

class RedisCache implements CacheDriver {
  readonly name = 'redis';
  constructor(private client: import('ioredis').Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delPrefix(prefix: string): Promise<void> {
    const stream = this.client.scanStream({ match: `${prefix}*`, count: 200 });
    for await (const keys of stream) {
      if ((keys as string[]).length) await this.client.del(...(keys as string[]));
    }
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, ttlSeconds);
    return count;
  }
}

async function build(): Promise<CacheDriver> {
  if (!env.REDIS_URL) return new MemoryCache();
  try {
    const { Redis } = await import('ioredis');
    const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: true });
    await client.connect();
    console.log('[cache] Redis connected');
    return new RedisCache(client);
  } catch (err) {
    console.warn('[cache] Redis unavailable, falling back to in-process cache:', (err as Error).message);
    return new MemoryCache();
  }
}

export const cache: CacheDriver = await build();

/** Cache-aside helper. */
export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const hit = await cache.get<T>(key);
  if (hit !== null) return hit;
  const value = await loader();
  await cache.set(key, value, ttlSeconds);
  return value;
}

export const CACHE_KEYS = {
  menu: 'menu:',
  categories: 'categories:all',
  analytics: 'analytics:',
  availability: 'availability:',
} as const;
