/**
 * Content-addressed frame/layer cache layer [BF-110][BF-111][BF-112].
 *
 * Stable keys: SHA-256 over canonical JSON of (composition config + props +
 * frame + render params) — object key order and undefined fields never
 * affect the digest [BF-110]. Storage is pluggable ({@link CacheStore}):
 * local filesystem for dev/CI, S3/GCS interface stubs for cloud [BF-111].
 * {@link ContentCache} wraps any store with hit/miss counters surfaced in
 * the CLI render output and Studio [BF-112].
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Deterministic JSON: object keys recursively sorted (UTF-16 code-unit
 * order), undefined object values dropped, arrays keep order. Scalar
 * semantics follow JSON.stringify.
 */
export const canonicalJson = (value: unknown): string => {
  const encode = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map((v) => (v === undefined ? null : encode(v)));
    }
    if (node === null || typeof node !== 'object') return node;
    return Object.fromEntries(
      Object.entries(node)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, encode(v)]),
    );
  };
  return JSON.stringify(encode(value)) ?? 'null';
};

/** Inputs hashed into a frame/layer cache key [BF-110]. */
export interface FrameCacheInput {
  /** Composition config (config object or preview URL string). */
  readonly composition: unknown;
  /** Composition props (undefined = none; dropped from the digest). */
  readonly props?: unknown;
  /** Frame index. */
  readonly frame: number;
  /** Render params (codec, flags, viewport, ...). */
  readonly renderParams?: unknown;
}

/**
 * Stable SHA-256 content key over the canonical JSON of the render inputs
 * [BF-110]. Same inputs → same key regardless of property order.
 */
export const frameCacheKey = (input: FrameCacheInput): string => {
  return createHash('sha256')
    .update(
      canonicalJson({
        composition: input.composition,
        props: input.props,
        frame: input.frame,
        renderParams: input.renderParams,
      }),
    )
    .digest('hex');
};

/** Pluggable binary store behind the content-addressed cache [BF-111]. */
export interface CacheStore {
  /** Store name (diagnostics). */
  readonly name: string;
  /** Bytes for `key`, or undefined when absent. */
  get(key: string): Promise<Uint8Array | undefined>;
  /** Persist bytes under `key` (overwrite on repeat). */
  put(key: string, data: Uint8Array): Promise<void>;
  /** Whether `key` exists. */
  has(key: string): Promise<boolean>;
}

/**
 * Local filesystem store: content-addressed files at
 * `<root>/<key[0..2]>/<key>.bin` (sharded to keep directories small).
 */
export class FsStore implements CacheStore {
  readonly name = 'fs';
  private readonly root: string;

  constructor(options: { root: string }) {
    this.root = options.root;
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    try {
      return new Uint8Array(await readFile(this.pathFor(key)));
    } catch {
      return undefined;
    }
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== undefined;
  }

  private pathFor(key: string): string {
    return join(this.root, key.slice(0, 2), `${key}.bin`);
  }
}

/** Config for the S3/GCS interface stubs [BF-111]. */
export interface RemoteStoreConfig {
  /** Bucket name. */
  readonly bucket: string;
  /** Key prefix inside the bucket (optional). */
  readonly prefix?: string;
}

/**
 * Shared refusal for the remote stubs: the CacheStore contract for cloud
 * object storage is fixed here; wiring a signed HTTP adapter is a
 * follow-up. Every operation throws until an adapter exists.
 */
const stubRefusal = (name: string, config: RemoteStoreConfig): Error =>
  new Error(
    `${name} [BF-111]: interface stub — configure an object-storage adapter ` +
      `(bucket: ${config.bucket}${config.prefix !== undefined ? `, prefix: ${config.prefix}` : ''})`,
  );

/** S3 store stub [BF-111] — CacheStore contract, throws until adapted. */
export class S3Store implements CacheStore {
  readonly name = 's3';
  constructor(private readonly config: RemoteStoreConfig) {}

  async get(): Promise<Uint8Array | undefined> {
    throw stubRefusal('S3Store', this.config);
  }
  async put(): Promise<void> {
    throw stubRefusal('S3Store', this.config);
  }
  async has(): Promise<boolean> {
    throw stubRefusal('S3Store', this.config);
  }
}

/** GCS store stub [BF-111] — CacheStore contract, throws until adapted. */
export class GcsStore implements CacheStore {
  readonly name = 'gcs';
  constructor(private readonly config: RemoteStoreConfig) {}

  async get(): Promise<Uint8Array | undefined> {
    throw stubRefusal('GcsStore', this.config);
  }
  async put(): Promise<void> {
    throw stubRefusal('GcsStore', this.config);
  }
  async has(): Promise<boolean> {
    throw stubRefusal('GcsStore', this.config);
  }
}

/** Hit/miss counters surfaced by the CLI render output and Studio [BF-112]. */
export interface ContentCacheStats {
  /** Lookups served from the store. */
  readonly hits: number;
  /** Lookups that required a render. */
  readonly misses: number;
  /** hits / (hits + misses); 0 when nothing was looked up. */
  readonly hitRate: number;
}

/** Result of {@link ContentCache.getOrCompute}. */
export interface ContentCacheOutcome {
  readonly data: Uint8Array;
  /** True when served from the store (cache hit). */
  readonly cached: boolean;
}

/**
 * Content-addressed cache over a pluggable store, with hit/miss counters
 * [BF-112]. Keys come from {@link frameCacheKey}; values are raw bytes.
 */
export class ContentCache {
  private readonly store: CacheStore;
  private hits = 0;
  private misses = 0;

  constructor(options: { store: CacheStore }) {
    this.store = options.store;
  }

  /** Bytes for `key` (undefined on miss); ticks a hit or miss counter. */
  async getBytes(key: string): Promise<Uint8Array | undefined> {
    const data = await this.store.get(key);
    if (data === undefined) this.misses += 1;
    else this.hits += 1;
    return data;
  }

  /** Persist bytes under `key`. */
  async putBytes(key: string, data: Uint8Array): Promise<void> {
    await this.store.put(key, data);
  }

  /**
   * Serve `key` from the store, or compute, store and return it. The
   * counters tick exactly once per lookup.
   */
  async getOrCompute(
    key: string,
    compute: () => Promise<Uint8Array>,
  ): Promise<ContentCacheOutcome> {
    const stored = await this.getBytes(key);
    if (stored !== undefined) return { data: stored, cached: true };
    const data = await compute();
    await this.putBytes(key, data);
    return { data, cached: false };
  }

  /** Cumulative hit/miss counters [BF-112]. */
  get stats(): ContentCacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }
}
