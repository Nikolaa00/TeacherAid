import { Redis } from "@upstash/redis";

/**
 * The only five operations the session needs. Upstash in production; an
 * in-process map for `next dev` so the demo runs with no accounts at all.
 */
export interface Store {
  getJSON<T>(key: string): Promise<T | null>;
  setJSON(key: string, value: unknown): Promise<void>;
  hset(key: string, field: string, value: unknown): Promise<void>;
  hgetall<T>(key: string): Promise<Record<string, T>>;
  del(...keys: string[]): Promise<void>;
}

class MemoryStore implements Store {
  private kv = new Map<string, string>();
  private hashes = new Map<string, Map<string, string>>();

  async getJSON<T>(key: string) {
    const raw = this.kv.get(key);
    return raw === undefined ? null : (JSON.parse(raw) as T);
  }
  async setJSON(key: string, value: unknown) {
    this.kv.set(key, JSON.stringify(value));
  }
  async hset(key: string, field: string, value: unknown) {
    if (!this.hashes.has(key)) this.hashes.set(key, new Map());
    this.hashes.get(key)!.set(field, JSON.stringify(value));
  }
  async hgetall<T>(key: string) {
    const out: Record<string, T> = {};
    for (const [f, v] of this.hashes.get(key) ?? []) out[f] = JSON.parse(v) as T;
    return out;
  }
  async del(...keys: string[]) {
    for (const k of keys) {
      this.kv.delete(k);
      this.hashes.delete(k);
    }
  }
}

class UpstashStore implements Store {
  constructor(private redis: Redis) {}

  async getJSON<T>(key: string) {
    return (await this.redis.get<T>(key)) ?? null;
  }
  async setJSON(key: string, value: unknown) {
    await this.redis.set(key, value);
  }
  async hset(key: string, field: string, value: unknown) {
    await this.redis.hset(key, { [field]: value });
  }
  async hgetall<T>(key: string) {
    return ((await this.redis.hgetall<Record<string, T>>(key)) ?? {}) as Record<string, T>;
  }
  async del(...keys: string[]) {
    if (keys.length) await this.redis.del(...keys);
  }
}

declare global {
  var __teacherAidStore: Store | undefined;
}

function create(): Store {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) return new UpstashStore(new Redis({ url, token }));
  if (process.env.NODE_ENV === "production") {
    console.warn("[store] No Upstash credentials — sessions live in one process's memory.");
  }
  return new MemoryStore();
}

// One instance per process; survives HMR in dev via globalThis.
export const store: Store = globalThis.__teacherAidStore ?? (globalThis.__teacherAidStore = create());
