/**
 * @brandlyframes/cache — remote asset cache [BF-428] + content-addressed
 * frame/layer cache layer [BF-110][BF-111][BF-112].
 *
 * Remote asset caching (fonts, videos, images) with SHA-256 checksums,
 * retry with exponential backoff, and prefetch; content-addressed frame
 * caching with canonical-JSON hashing, pluggable stores and hit/miss
 * counters.
 */

export { AssetCache, prefetch } from './cache.js';
export {
  ContentCache,
  FsStore,
  GcsStore,
  S3Store,
  canonicalJson,
  frameCacheKey,
} from './content.js';
export type {
  CacheStore,
  ContentCacheOutcome,
  ContentCacheStats,
  FrameCacheInput,
  RemoteStoreConfig,
} from './content.js';
export type {
  AssetCacheOptions,
  AssetChecksum,
  CacheEntry,
  PrefetchResult,
} from './types.js';
