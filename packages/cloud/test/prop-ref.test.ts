/**
 * Large props by reference (BF-473): blob/URL handle type, in-memory store,
 * renderer-side resolution before invoke, and inline payload size limits.
 */

import { describe, expect, it } from 'vitest';
import {
  assertPropsUnderLimit,
  createPropRef,
  estimatePropsBytes,
  InMemoryPropRefStore,
  isPropRef,
  MAX_INLINE_PROP_BYTES,
  PropSizeExceededError,
  resolvePropRefs,
  toPropRef,
  type PropRefHandle,
} from '../src/prop-ref';

describe('PropRef handle type (BF-473)', () => {
  it('wraps an existing URL handle synchronously', () => {
    const handle: PropRefHandle = {
      kind: 'url',
      refId: 'video-main',
      location: 'https://cdn.example.com/big-video.mp4',
    };
    const ref = toPropRef<{ url: string }>(handle);
    expect(isPropRef(ref)).toBe(true);
    expect(ref.handle.location).toBe('https://cdn.example.com/big-video.mp4');
  });

  it('isPropRef rejects plain values', () => {
    expect(isPropRef({})).toBe(false);
    expect(isPropRef('video')).toBe(false);
    expect(isPropRef(null)).toBe(false);
    expect(isPropRef(undefined)).toBe(false);
  });

  it('createPropRef stores data through a store and returns a handle', async () => {
    const store = new InMemoryPropRefStore();
    const bigFrames = new Array(1000).fill('#ff0000');
    const ref = await createPropRef(bigFrames, { store });
    expect(isPropRef(ref)).toBe(true);
    expect(ref.handle.kind).toBe('blob');
    const roundtripped = await store.get(ref.handle);
    expect(roundtripped).toEqual(bigFrames);
  });

  it('in-memory store handles are unique per put', async () => {
    const store = new InMemoryPropRefStore();
    const a = await store.put('a');
    const b = await store.put('b');
    expect(a.refId).not.toBe(b.refId);
  });
});

describe('resolvePropRefs (BF-473)', () => {
  it('resolves handles nested in props before invoke', async () => {
    const store = new InMemoryPropRefStore();
    const bigData = { frames: new Array(500).fill(1) };
    const ref = await createPropRef(bigData, { store });

    const props = {
      title: 'hello',
      video: ref,
      nested: { list: [ref, 'plain'] },
    };
    const resolved = await resolvePropRefs(props, (handle) => store.get(handle));
    expect(resolved.title).toBe('hello');
    expect(resolved.video).toEqual(bigData);
    expect((resolved.nested.list[0] as unknown as typeof bigData).frames).toHaveLength(500);
    expect(resolved.nested.list[1]).toBe('plain');
  });

  it('keeps props without refs untouched', async () => {
    const props = { a: 1, b: { c: [1, 2, 3] } };
    const resolved = await resolvePropRefs(props, () => {
      throw new Error('resolver must not be called');
    });
    expect(resolved).toEqual(props);
  });

  it('resolved data feeds a chunk request under payload limits', async () => {
    const store = new InMemoryPropRefStore();
    const ref = await createPropRef({ big: true }, { store });
    const resolved = await resolvePropRefs({ input: ref }, (h) => store.get(h));
    expect(estimatePropsBytes(resolved)).toBeLessThan(MAX_INLINE_PROP_BYTES);
    expect(estimatePropsBytes({ input: ref })).toBeGreaterThan(
      estimatePropsBytes({ input: {} })
    );
  });
});

describe('payload size limits (BF-473)', () => {
  it('estimates JSON byte length', () => {
    expect(estimatePropsBytes({})).toBe(2);
    expect(estimatePropsBytes({ a: 'hello' })).toBeGreaterThan(2);
  });

  it('assertPropsUnderLimit passes small props', () => {
    expect(() => assertPropsUnderLimit({ a: 1 })).not.toThrow();
  });

  it('throws PropSizeExceededError over the limit', () => {
    const huge = { data: 'x'.repeat(MAX_INLINE_PROP_BYTES + 1) };
    expect(() => assertPropsUnderLimit(huge)).toThrow(PropSizeExceededError);
  });

  it('has a conservative default inline limit', () => {
    expect(MAX_INLINE_PROP_BYTES).toBe(256 * 1024);
  });

  it('honours a custom limit', () => {
    expect(() => assertPropsUnderLimit({ a: 'xxx' }, 3)).toThrow(PropSizeExceededError);
  });
});
