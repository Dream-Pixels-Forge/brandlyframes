/**
 * `MediaCache` — a bounded LRU cache for decoded media frames / assets.
 *
 * Entries are keyed by a string and hold an arbitrary value. `get` and
 * `set` mark the entry as most-recently-used; when the cache exceeds
 * `maxSize`, the least-recently-used entry is evicted. Pure TypeScript,
 * no React, no DOM, no wall-clock — safe in render workers and Node.
 *
 * When `maxSize` is omitted the cache is unbounded (entries never evict).
 */
export class MediaCache<V> {
  private readonly entries = new Map<string, V>();
  /** Maximum number of entries before eviction (null = unbounded). */
  public readonly maxSize: number | null;

  constructor(options: { maxSize?: number } = {}) {
    this.maxSize = options.maxSize ?? null;
  }

  /** Number of entries currently held. */
  get size(): number {
    return this.entries.size;
  }

  /** Returns the value for `key`, or `undefined` when absent. Marks the entry as most-recently-used. */
  get(key: string): V | undefined {
    const value = this.entries.get(key);
    if (value === undefined) {
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  /** Stores `value` under `key`, evicting the least-recently-used entry when over `maxSize`. */
  set(key: string, value: V): void {
    if (this.entries.has(key)) {
      this.entries.delete(key);
    }
    this.entries.set(key, value);
    this.evictIfOverCapacity();
  }

  /** Returns `true` when `key` is present. Does not affect recency. */
  has(key: string): boolean {
    return this.entries.has(key);
  }

  /** Removes `key`. Returns `true` when an entry was removed. */
  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  private evictIfOverCapacity(): void {
    if (this.maxSize === null) {
      return;
    }
    while (this.entries.size > this.maxSize) {
      const firstKey = this.entries.keys().next().value;
      if (firstKey === undefined) {
        return;
      }
      this.entries.delete(firstKey);
    }
  }
}
