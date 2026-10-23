/**
 * Content-addressed frame/layer cache — hash stability, store round-trip,
 * hit/miss counters [BF-110][BF-111][BF-112].
 */

import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  ContentCache,
  FsStore,
  GcsStore,
  S3Store,
  canonicalJson,
  frameCacheKey,
} from '../src/index.js';

const tmpDir = mkdtempSync(join(tmpdir(), 'bf-content-cache-test-'));
afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// BF-110: canonical JSON + stable hashing
// ---------------------------------------------------------------------------

describe('canonicalJson [BF-110]', () => {
  it('is key-order independent', () => {
    const a = canonicalJson({ a: 1, b: { c: 2, d: 3 } });
    const b = canonicalJson({ b: { d: 3, c: 2 }, a: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":1,"b":{"c":2,"d":3}}');
  });

  it('preserves array order', () => {
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]');
    expect(canonicalJson([{ a: 1 }, { b: 2 }])).not.toBe(
      canonicalJson([{ b: 2 }, { a: 1 }]),
    );
  });

  it('drops undefined object values and follows JSON.stringify scalars', () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
    expect(canonicalJson('x')).toBe('"x"');
    expect(canonicalJson(null)).toBe('null');
    expect(canonicalJson(42)).toBe('42');
  });
});

describe('frameCacheKey [BF-110]', () => {
  const key = (
    frame: number,
    overrides: Partial<Parameters<typeof frameCacheKey>[0]> = {},
  ): string =>
    frameCacheKey({
      composition: { id: 'hero', width: 1920, height: 1080 },
      props: undefined,
      frame,
      renderParams: { codec: 'h264', crf: 18 },
      ...overrides,
    });

  it('is stable across key order, undefined props and repeats', () => {
    const reordered = frameCacheKey({
      renderParams: { crf: 18, codec: 'h264' },
      frame: 0,
      composition: { height: 1080, width: 1920, id: 'hero' },
    });
    expect(key(0)).toBe(reordered);
    expect(key(0)).toBe(key(0));
  });

  it('is a 64-char lowercase hex SHA-256', () => {
    expect(key(0)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes with frame, props and render params', () => {
    const base = key(0);
    expect(base).not.toBe(key(1));
    expect(base).not.toBe(key(0, { props: { color: 'red' } }));
    expect(base).not.toBe(
      key(0, { renderParams: { codec: 'h264', crf: 20 } }),
    );
    expect(base).not.toBe(key(0, { composition: { id: 'other' } }));
  });
});

// ---------------------------------------------------------------------------
// BF-111: pluggable store — fs implementation round-trip, remote stubs
// ---------------------------------------------------------------------------

describe('FsStore round-trip [BF-111]', () => {
  it('put/get/has round-trips bytes content-addressed by key', async () => {
    const store = new FsStore({ root: join(tmpDir, 'fs-store') });
    const key = frameCacheKey({ composition: 'x', frame: 7 });
    const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 7]);

    expect(await store.has(key)).toBe(false);
    expect(await store.get(key)).toBeUndefined();

    await store.put(key, data);
    expect(await store.has(key)).toBe(true);
    const read = await store.get(key);
    expect(read).toBeDefined();
    expect(Buffer.from(read as Uint8Array).equals(Buffer.from(data))).toBe(true);
  });

  it('same key overwrites; different keys never collide', async () => {
    const store = new FsStore({ root: join(tmpDir, 'fs-store2') });
    const k1 = frameCacheKey({ frame: 1 });
    const k2 = frameCacheKey({ frame: 2 });
    await store.put(k1, new Uint8Array([1]));
    await store.put(k1, new Uint8Array([9, 9]));
    expect([...(await store.get(k1) as Uint8Array)]).toEqual([9, 9]);
    expect(await store.has(k2)).toBe(false);
  });
});

describe('remote store stubs [BF-111]', () => {
  it('S3Store and GcsStore satisfy CacheStore and refuse unconfigured use', async () => {
    const stores = [
      ['S3Store', new S3Store({ bucket: 'bf-cache' })],
      ['GcsStore', new GcsStore({ bucket: 'bf-cache' })],
    ] as const;
    for (const [name, store] of stores) {
      expect(store.name.length).toBeGreaterThan(0);
      await expect(store.get('k')).rejects.toThrow(name);
      await expect(store.put('k', new Uint8Array([1]))).rejects.toThrow(name);
      await expect(store.has('k')).rejects.toThrow(name);
    }
  });
});

// ---------------------------------------------------------------------------
// BF-112: hit/miss counters
// ---------------------------------------------------------------------------

describe('ContentCache counters [BF-112]', () => {
  it('miss computes and stores, hit serves bytes from the store', async () => {
    const cache = new ContentCache({
      store: new FsStore({ root: join(tmpDir, 'content-cache') }),
    });
    const key = frameCacheKey({ frame: 42 });
    const bytes = new Uint8Array([1, 2, 3]);
    let renders = 0;
    const render = async (): Promise<Uint8Array> => {
      renders += 1;
      return bytes;
    };

    const first = await cache.getOrCompute(key, render);
    expect(first.cached).toBe(false);
    expect(renders).toBe(1);

    const second = await cache.getOrCompute(key, render);
    expect(second.cached).toBe(true);
    expect(renders).toBe(1);
    expect(Buffer.from(second.data).equals(Buffer.from(bytes))).toBe(true);

    expect(cache.stats).toEqual({ hits: 1, misses: 1, hitRate: 0.5 });
  });

  it('stats start at zero and hitRate is 0 with no lookups', () => {
    const cache = new ContentCache({
      store: new FsStore({ root: join(tmpDir, 'content-cache-empty') }),
    });
    expect(cache.stats).toEqual({ hits: 0, misses: 0, hitRate: 0 });
  });
});
