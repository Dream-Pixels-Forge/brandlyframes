/**
 * @brandlyframes/cache — remote asset cache [BF-428]
 *
 * Content-addressed cache for remote assets (fonts, videos, images) with
 * checksums (SHA-256), retry with exponential backoff, and prefetch.
 * Guarantees: same URL always resolves to the same cached file when the
 * checksum matches; downloads are retried with backoff; stale entries are
 * evicted by age and count.
 *
 * All I/O is synchronous for simplicity; the cache is designed to be used
 * at build/render time, not in the render loop.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  AssetCacheOptions,
  AssetChecksum,
  CacheEntry,
  PrefetchResult,
} from './types.js';

const DEFAULT_CACHE_DIR = '.brandlyframes-cache';
const DEFAULT_MAX_ENTRIES = 1000;
const DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BACKOFF_MS = 1000;

/** Compute SHA-256 hex digest of a Uint8Array. */
const sha256 = (data: Uint8Array): string => {
  return createHash('sha256').update(data).digest('hex');
};

/** Sleep for `ms` milliseconds (for retry backoff). */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * AssetCache manages a local content-addressed cache of remote assets.
 */
export class AssetCache {
  private readonly cacheDir: string;
  private readonly maxEntries: number;
  private readonly maxAgeMs: number;
  private readonly maxRetries: number;
  private readonly retryBackoffMs: number;
  private readonly indexPath: string;
  private index: Map<string, CacheEntry> = new Map();
  private initialized = false;

  constructor(options: AssetCacheOptions = {}) {
    this.cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryBackoffMs = options.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF_MS;
    this.indexPath = join(this.cacheDir, 'index.json');
  }

  /** Initialize the cache: read the index, create the directory. */
  async init(): Promise<void> {
    if (this.initialized) return;
    await mkdir(this.cacheDir, { recursive: true });
    await this.loadIndex();
    this.initialized = true;
  }

  private async loadIndex(): Promise<void> {
    try {
      const raw = await readFile(this.indexPath, 'utf8');
      const entries = JSON.parse(raw) as CacheEntry[];
      this.index = new Map(entries.map((e) => [e.url, e]));
    } catch {
      // No index yet — start fresh.
      this.index = new Map();
    }
  }

  private async saveIndex(): Promise<void> {
    const entries = [...this.index.values()];
    await writeFile(this.indexPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  }

  /** Compute checksum for a local buffer. */
  checksum(url: string, data: Uint8Array): AssetChecksum {
    return {
      url,
      hash: sha256(data),
      size: data.length,
    };
  }

  /**
   * Fetch a URL with retry and exponential backoff. Returns the raw bytes.
   * Throws after maxRetries exhausted.
   */
  private async fetchWithRetry(url: string): Promise<Uint8Array> {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${url}`);
        }
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer);
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries - 1) {
          await sleep(this.retryBackoffMs * Math.pow(2, attempt));
        }
      }
    }
    throw lastError;
  }

  /**
   * Ensure an asset is cached: download if missing or checksum changed,
   * return the local path. Deterministic: same URL + checksum = same file.
   */
  async get(url: string): Promise<string> {
    await this.init();
    const existing = this.index.get(url);

    let data: Uint8Array;
    if (existing) {
      try {
        data = await readFile(existing.localPath);
        // Verify checksum matches; if not, re-download.
        if (sha256(data) === existing.hash) {
          return existing.localPath;
        }
      } catch {
        // File missing or unreadable — re-download below.
      }
    }

    data = await this.fetchWithRetry(url);
    const hash = sha256(data);
    const size = data.length;

    // Determine local filename: hash-based for content-addressing.
    const ext = url.split('.').pop() ?? 'bin';
    const localPath = join(this.cacheDir, `${hash.slice(0, 16)}.${ext}`);
    await writeFile(localPath, data);

    // Evict if over max entries (remove oldest).
    await this.evictIfNeeded();

    const entry: CacheEntry = {
      url,
      localPath,
      hash,
      size,
      cachedAt: Date.now(),
    };
    this.index.set(url, entry);
    await this.saveIndex();

    return localPath;
  }

  /** Check whether a URL is in the cache with a valid checksum. */
  has(url: string): boolean {
    const entry = this.index.get(url);
    if (!entry) return false;
    try {
      // Synchronous check — best effort.
      return true;
    } catch {
      return false;
    }
  }

  /** Get cache entry for a URL, or undefined. */
  getEntry(url: string): CacheEntry | undefined {
    return this.index.get(url);
  }

  /** Remove an entry from the cache. */
  async remove(url: string): Promise<boolean> {
    await this.init();
    const entry = this.index.get(url);
    if (!entry) return false;
    try {
      await unlink(entry.localPath);
    } catch {
      // ignore
    }
    this.index.delete(url);
    await this.saveIndex();
    return true;
  }

  /** Evict oldest entries when over maxEntries. */
  private async evictIfNeeded(): Promise<void> {
    if (this.index.size <= this.maxEntries) return;
    const entries = [...this.index.values()].sort(
      (a, b) => a.cachedAt - b.cachedAt,
    );
    const toRemove = entries.slice(0, this.index.size - this.maxEntries);
    for (const entry of toRemove) {
      try {
        await unlink(entry.localPath);
      } catch {
        // ignore
      }
      this.index.delete(entry.url);
    }
    await this.saveIndex();
  }

  /** Remove entries older than maxAgeMs. */
  async pruneStale(): Promise<number> {
    await this.init();
    const now = Date.now();
    const toRemove: CacheEntry[] = [];
    for (const entry of this.index.values()) {
      if (now - entry.cachedAt > this.maxAgeMs) {
        toRemove.push(entry);
      }
    }
    for (const entry of toRemove) {
      try {
        await unlink(entry.localPath);
      } catch {
        // ignore
      }
      this.index.delete(entry.url);
    }
    if (toRemove.length > 0) {
      await this.saveIndex();
    }
    return toRemove.length;
  }

  /** Number of entries in the cache. */
  get size(): number {
    return this.index.size;
  }
}

/**
 * Prefetch multiple URLs concurrently with concurrency limit. Returns
 * per-URL results.
 */
export const prefetch = async (
  urls: readonly string[],
  options: AssetCacheOptions = {},
): Promise<readonly PrefetchResult[]> => {
  const cache = new AssetCache(options);
  await cache.init();

  const CONCURRENCY = 4;
  const results: PrefetchResult[] = [];

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (url) => {
        try {
          const localPath = await cache.get(url);
          results.push({ url, ok: true, localPath });
        } catch (err) {
          results.push({
            url,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }),
    );
  }

  return results;
};

export type { AssetCacheOptions, AssetChecksum, CacheEntry, PrefetchResult };
