import { describe, it, expect } from 'vitest';
import { deriveFrameKey, FrameStore } from '../src/index';

/**
 * FrameStore [BF-052]: content-hashed keys + LRU memory cache.
 *
 * `deriveFrameKey` builds a deterministic cache key from a source content
 * hash, a frame index, and optional decode parameters. Params are
 * stable-sorted before serialization so insertion order never affects the
 * key. `FrameStore` is a bounded LRU map: both `get` (hit) and `set`
 * refresh recency, while `has` deliberately does not.
 */
describe('FrameStore [BF-052]', () => {
  describe('deriveFrameKey', () => {
    it('is deterministic: same inputs produce the same key', () => {
      const a = deriveFrameKey('src-abc', 12);
      const b = deriveFrameKey('src-abc', 12);
      expect(a).toBe(b);
    });

    it('treats decodeParams with different insertion order as identical', () => {
      const a = deriveFrameKey('src-abc', 5, { w: 1920, h: 1080 });
      const b = deriveFrameKey('src-abc', 5, { h: 1080, w: 1920 });
      expect(a).toBe(b);
    });

    it('produces different keys for different param values', () => {
      const a = deriveFrameKey('src-abc', 5, { w: 1920 });
      const b = deriveFrameKey('src-abc', 5, { w: 1280 });
      expect(a).not.toBe(b);
    });

    it('produces different keys for different source hashes and frame indices', () => {
      const base = deriveFrameKey('src-abc', 5);
      expect(deriveFrameKey('src-def', 5)).not.toBe(base);
      expect(deriveFrameKey('src-abc', 6)).not.toBe(base);
    });

    it('distinguishes params with the same names but different values in aggregate', () => {
      const a = deriveFrameKey('src-abc', 0, { scale: 1, fmt: 'png' });
      const b = deriveFrameKey('src-abc', 0, { scale: 2, fmt: 'png' });
      const c = deriveFrameKey('src-abc', 0, { scale: 1, fmt: 'jpg' });
      expect(a).not.toBe(b);
      expect(a).not.toBe(c);
      expect(b).not.toBe(c);
    });

    it('supports string and number param values', () => {
      const key = deriveFrameKey('src-abc', 3, { fmt: 'png', scale: 2 });
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });
  });

  describe('FrameStore', () => {
    it('returns undefined on miss', () => {
      const store = new FrameStore<string>({ maxMemoryEntries: 2 });
      expect(store.get('nope')).toBeUndefined();
      expect(store.size).toBe(0);
    });

    it('round-trips a set value and reports size', () => {
      const store = new FrameStore<string>({ maxMemoryEntries: 2 });
      store.set('k1', 'v1');
      expect(store.get('k1')).toBe('v1');
      expect(store.size).toBe(1);
    });

    it('evicts the least-recently-used entry when over capacity (insert A, B, C with max 2 → A evicted)', () => {
      const store = new FrameStore<string>({ maxMemoryEntries: 2 });
      store.set('A', 'a');
      store.set('B', 'b');
      store.set('C', 'c');
      expect(store.size).toBe(2);
      // A was least recently used (insertion order) → evicted.
      expect(store.get('A')).toBeUndefined();
      expect(store.get('B')).toBe('b');
      expect(store.get('C')).toBe('c');
    });

    it('get hit refreshes recency: set A, B (max 2); get(A); set C → B evicted, A survives', () => {
      const store = new FrameStore<string>({ maxMemoryEntries: 2 });
      store.set('A', 'a');
      store.set('B', 'b');
      expect(store.get('A')).toBe('a'); // refresh A's recency
      store.set('C', 'c'); // now B is LRU
      expect(store.get('B')).toBeUndefined();
      expect(store.get('A')).toBe('a');
      expect(store.get('C')).toBe('c');
    });

    it('get miss does not change contents or recency', () => {
      const store = new FrameStore<string>({ maxMemoryEntries: 2 });
      store.set('A', 'a');
      store.set('B', 'b');
      expect(store.get('ghost')).toBeUndefined();
      expect(store.size).toBe(2);
      // Recency untouched by the miss: A is still LRU.
      store.set('C', 'c');
      expect(store.get('A')).toBeUndefined();
      expect(store.get('B')).toBe('b');
    });

    it('set refreshes recency: set A, B, A', () => {
      const store = new FrameStore<string>({ maxMemoryEntries: 2 });
      store.set('A', 'a');
      store.set('B', 'b');
      store.set('A', 'a2'); // overwrite → A becomes most recent
      store.set('C', 'c'); // B is LRU now
      expect(store.get('B')).toBeUndefined();
      expect(store.get('A')).toBe('a2');
    });

    it('set overwrite keeps a single entry with the new value', () => {
      const store = new FrameStore<string>({ maxMemoryEntries: 4 });
      store.set('k', 'v1');
      store.set('k', 'v2');
      expect(store.size).toBe(1);
      expect(store.get('k')).toBe('v2');
    });

    it('has reports presence without updating recency', () => {
      const store = new FrameStore<string>({ maxMemoryEntries: 2 });
      store.set('A', 'a');
      store.set('B', 'b');
      expect(store.has('A')).toBe(true);
      expect(store.has('ghost')).toBe(false);
      // has(A) must NOT have refreshed A's recency → A is still LRU.
      store.set('C', 'c');
      expect(store.get('A')).toBeUndefined();
      expect(store.get('B')).toBe('b');
      expect(store.get('C')).toBe('c');
    });

    it('clear removes all entries', () => {
      const store = new FrameStore<string>({ maxMemoryEntries: 3 });
      store.set('A', 'a');
      store.set('B', 'b');
      store.clear();
      expect(store.size).toBe(0);
      expect(store.get('A')).toBeUndefined();
      expect(store.has('B')).toBe(false);
      // Store remains usable after clear.
      store.set('D', 'd');
      expect(store.get('D')).toBe('d');
      expect(store.size).toBe(1);
    });

    it('size reflects entry count through eviction cycles', () => {
      const store = new FrameStore<number>({ maxMemoryEntries: 3 });
      expect(store.size).toBe(0);
      store.set('A', 1);
      store.set('B', 2);
      store.set('C', 3);
      expect(store.size).toBe(3);
      store.set('D', 4); // evicts A
      expect(store.size).toBe(3);
    });

    it('stores arbitrary values (generic type)', () => {
      const store = new FrameStore<{ pts: bigint }>({ maxMemoryEntries: 1 });
      store.set('k', { pts: 90000n });
      expect(store.get('k')?.pts).toBe(90000n);
    });
  });
});
