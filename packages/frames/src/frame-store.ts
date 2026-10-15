/**
 * FrameStore [BF-052] — content-hashed deterministic frame keys + a bounded
 * LRU in-memory cache for decoded frame data.
 *
 * Clean-room implementation.
 */

/**
 * Builds a deterministic cache key for a decoded frame.
 *
 * The key combines the source content hash, the frame index, and the
 * (optionally provided) decode parameters. Parameters are stable-sorted by
 * name before serialization, so the insertion order of the object's keys
 * never affects the resulting key string: identical inputs always yield an
 * identical key, and any change to the hash, index, or a parameter value
 * yields a different key.
 *
 * @param sourceHash - content hash identifying the source media
 * @param frameIndex - frame index within the source
 * @param decodeParams - optional decode parameters (string or number values),
 *   e.g. `{ width: 1920, format: 'yuv420p' }`
 * @returns deterministic key string
 */
export const deriveFrameKey = (
  sourceHash: string,
  frameIndex: number,
  decodeParams?: Record<string, string | number>,
): string => {
  const parts: string[] = [`src=${sourceHash}`, `frame=${frameIndex}`];
  if (decodeParams !== undefined) {
    const sortedNames = Object.keys(decodeParams).sort();
    for (const name of sortedNames) {
      const value = decodeParams[name];
      parts.push(`${name}=${typeof value}:${String(value)}`);
    }
  }
  return parts.join('|');
};

/**
 * Options for constructing a {@link FrameStore}.
 */
export interface FrameStoreOptions {
  /** Maximum number of entries to keep in memory. When exceeded, the
   * least-recently-used entry is evicted. */
  maxMemoryEntries: number;
}

/**
 * Bounded least-recently-used (LRU) cache for decoded frame data, keyed by
 * {@link deriveFrameKey} strings (or any string key).
 *
 * Recency semantics: a successful `get` (hit) and every `set` (insert or
 * overwrite) count as a "use" and move the entry to the most-recently-used
 * position. A `get` miss and `has` do **not** change recency. When `set`
 * pushes the store over `maxMemoryEntries`, the least-recently-used entry is
 * evicted. Backed by `Map` insertion order, so all operations are O(1).
 *
 * @typeParam T - type of the cached values
 */
export class FrameStore<T> {
  readonly #entries = new Map<string, T>();
  readonly #maxMemoryEntries: number;

  /**
   * Creates an empty store.
   *
   * @param options - store options; `maxMemoryEntries` must be a
   *   non-negative safe integer
   * @throws {Error} if `maxMemoryEntries` is not a non-negative safe integer
   */
  constructor(options: FrameStoreOptions) {
    const { maxMemoryEntries } = options;
    if (!Number.isSafeInteger(maxMemoryEntries) || maxMemoryEntries < 0) {
      throw new Error(
        `maxMemoryEntries must be a non-negative safe integer, got ${maxMemoryEntries}`,
      );
    }
    this.#maxMemoryEntries = maxMemoryEntries;
  }

  /** Number of entries currently held in memory. */
  get size(): number {
    return this.#entries.size;
  }

  /**
   * Looks up a value by key.
   *
   * On a hit, the entry's recency is refreshed (it becomes the
   * most-recently-used). On a miss, returns `undefined` and leaves the store
   * unchanged.
   *
   * @param key - cache key
   * @returns the cached value, or `undefined` on miss
   */
  get(key: string): T | undefined {
    const value = this.#entries.get(key);
    if (value === undefined && !this.#entries.has(key)) {
      return undefined;
    }
    // Refresh recency: Map.set on an existing key moves it to the end
    // (most-recently-used) without changing size.
    this.#entries.delete(key);
    this.#entries.set(key, value as T);
    return value;
  }

  /**
   * Inserts or overwrites a value, refreshing its recency. Overwriting an
   * existing key keeps a single entry. If the store exceeds its capacity
   * afterwards, the least-recently-used entry is evicted.
   *
   * @param key - cache key
   * @param value - value to cache
   */
  set(key: string, value: T): void {
    // Delete first so re-setting an existing key moves it to MRU position.
    this.#entries.delete(key);
    this.#entries.set(key, value);
    while (this.#entries.size > this.#maxMemoryEntries) {
      const oldest = this.#entries.keys().next();
      if (oldest.done === true) {
        break;
      }
      this.#entries.delete(oldest.value);
    }
  }

  /**
   * Checks whether a key is present **without** updating its recency.
   *
   * @param key - cache key
   * @returns `true` if the key is cached
   */
  has(key: string): boolean {
    return this.#entries.has(key);
  }

  /** Removes all entries, leaving the store empty and reusable. */
  clear(): void {
    this.#entries.clear();
  }
}
