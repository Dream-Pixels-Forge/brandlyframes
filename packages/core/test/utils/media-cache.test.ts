import { describe, expect, it } from 'vitest';
import { MediaCache } from '../../src/utils';

describe('MediaCache', () => {
  it('stores and retrieves a value by key', () => {
    const cache = new MediaCache<string>({ maxSize: 10 });
    cache.set('a', 'alpha');
    expect(cache.get('a')).toBe('alpha');
    expect(cache.has('a')).toBe(true);
    expect(cache.size).toBe(1);
  });

  it('returns undefined for a missing key', () => {
    const cache = new MediaCache<string>({ maxSize: 10 });
    expect(cache.get('missing')).toBeUndefined();
    expect(cache.has('missing')).toBe(false);
  });

  it('overwrites an existing key without growing size', () => {
    const cache = new MediaCache<string>({ maxSize: 10 });
    cache.set('a', 'alpha');
    cache.set('a', 'beta');
    expect(cache.get('a')).toBe('beta');
    expect(cache.size).toBe(1);
  });

  it('deletes a key', () => {
    const cache = new MediaCache<string>({ maxSize: 10 });
    cache.set('a', 'alpha');
    expect(cache.delete('a')).toBe(true);
    expect(cache.has('a')).toBe(false);
    expect(cache.size).toBe(0);
    expect(cache.delete('a')).toBe(false);
  });

  it('evicts the least-recently-used entry when over maxSize', () => {
    const cache = new MediaCache<string>({ maxSize: 2 });
    cache.set('a', 'alpha'); // order: a
    cache.set('b', 'beta'); // order: a, b
    cache.get('a'); // order: b, a (a touched)
    cache.set('c', 'gamma'); // over cap → evict b (least recently used)
    expect(cache.has('b')).toBe(false);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(true);
    expect(cache.size).toBe(2);
    expect(cache.get('a')).toBe('alpha');
    expect(cache.get('c')).toBe('gamma');
  });

  it('evicts the oldest entry on insertion when at capacity', () => {
    const cache = new MediaCache<string>({ maxSize: 1 });
    cache.set('a', 'alpha');
    cache.set('b', 'beta');
    expect(cache.has('a')).toBe(false);
    expect(cache.get('b')).toBe('beta');
    expect(cache.size).toBe(1);
  });

  it('defaults to unbounded growth when no maxSize is given', () => {
    const cache = new MediaCache<string>();
    cache.set('a', 'alpha');
    cache.set('b', 'beta');
    cache.set('c', 'gamma');
    expect(cache.size).toBe(3);
    expect(cache.has('a')).toBe(true);
  });

  it('is deterministic across instances', () => {
    const a = new MediaCache<number>({ maxSize: 2 });
    const b = new MediaCache<number>({ maxSize: 2 });
    a.set('x', 1);
    a.set('y', 2);
    b.set('x', 1);
    b.set('y', 2);
    expect(a.get('x')).toBe(b.get('x'));
    expect(a.get('y')).toBe(b.get('y'));
    expect(a.size).toBe(b.size);
  });
});
