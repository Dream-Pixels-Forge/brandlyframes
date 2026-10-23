/**
 * @brandlyframes/cache — remote asset cache types [BF-428]
 *
 * Types for content-addressed caching of remote assets (fonts, videos,
 * images) with checksums, retry, and prefetch. Deterministic: pure
 * functions, no Math.random, no Date.now.
 */

/** Result of computing a checksum for an asset. */
export interface AssetChecksum {
  /** The asset URL. */
  readonly url: string;
  /** SHA-256 hex digest of the asset bytes. */
  readonly hash: string;
  /** Size in bytes. */
  readonly size: number;
}

/** Cache entry: local file path and checksum for a remote asset. */
export interface CacheEntry {
  /** The asset URL. */
  readonly url: string;
  /** Local file path where the asset is cached. */
  readonly localPath: string;
  /** SHA-256 hex digest. */
  readonly hash: string;
  /** Size in bytes. */
  readonly size: number;
  /** Unix timestamp when the entry was cached. */
  readonly cachedAt: number;
}

/** Configuration for the AssetCache. */
export interface AssetCacheOptions {
  /** Cache directory (default: <cwd>/.brandlyframes-cache). */
  readonly cacheDir?: string;
  /** Maximum entries (default: 1000). */
  readonly maxEntries?: number;
  /** Maximum age in ms before an entry is considered stale (default: 30 days). */
  readonly maxAgeMs?: number;
  /** Maximum retry attempts for downloads (default: 3). */
  readonly maxRetries?: number;
  /** Retry backoff base in ms (default: 1000). */
  readonly retryBackoffMs?: number;
}

/** Prefetch result for one URL. */
export interface PrefetchResult {
  /** The asset URL. */
  readonly url: string;
  /** Whether the asset was successfully cached. */
  readonly ok: boolean;
  /** Local path if successful. */
  readonly localPath?: string;
  /** Error message if failed. */
  readonly error?: string;
}
