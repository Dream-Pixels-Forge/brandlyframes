import { describe, expect, it, vi } from 'vitest';

const loadRandom = async () => {
  vi.resetModules();
  return await import('../../src/utils/random');
};

describe('random (BF-400)', () => {
  it('returns the same value for the same numeric seed', async () => {
    const { random } = await loadRandom();
    expect(random(42)).toBe(random(42));
  });

  it('returns the same value for the same string seed', async () => {
    const { random } = await loadRandom();
    expect(random('drop')).toBe(random('drop'));
  });

  it('returns the same value for the same seed AND frame', async () => {
    const { random } = await loadRandom();
    expect(random('particles', 10)).toBe(random('particles', 10));
    expect(random(7, 1234)).toBe(random(7, 1234));
  });

  it('returns different values for different frames with the same seed', async () => {
    const { random } = await loadRandom();
    const values = new Set(Array.from({ length: 50 }, (_, frame) => random('seed', frame)));
    expect(values.size).toBeGreaterThan(45);
  });

  it('returns different values for different seeds', async () => {
    const { random } = await loadRandom();
    const values = new Set(Array.from({ length: 50 }, (_, i) => random(`seed-${i}`)));
    expect(values.size).toBe(50);
  });

  it('returns values in [0, 1)', async () => {
    const { random } = await loadRandom();
    for (let i = 0; i < 500; i++) {
      const value = random(i, i * 7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is deterministic across fresh module loads (process restarts)', async () => {
    const first = await loadRandom();
    const second = await loadRandom();
    expect(first.random('drop', 10)).toBe(second.random('drop', 10));
    expect(first.random(1234)).toBe(second.random(1234));
  });

  it('random(null) is deterministic per call order across fresh module loads', async () => {
    const first = await loadRandom();
    const second = await loadRandom();
    const sequenceOne = [first.random(null), first.random(null), first.random(null)];
    const sequenceTwo = [second.random(null), second.random(null), second.random(null)];
    expect(sequenceOne).toEqual(sequenceTwo);
  });

  it('mixes the frame into the seed: seed+frame differs from seed alone', async () => {
    const { random } = await loadRandom();
    // Statistical, not structural: 50 pairs of (seed, frame) vs (seed) values should differ.
    const pairs = new Set(Array.from({ length: 50 }, (_, i) => random(`s${i}`, i)));
    const singles = Array.from({ length: 50 }, (_, i) => random(`s${i}`));
    let collisions = 0;
    for (let i = 0; i < 50; i++) {
      if (pairs.has(singles[i])) collisions++;
    }
    expect(collisions).toBeLessThan(5);
  });
});

describe('random(seed, min, max) (BF-400)', () => {
  it('is deterministic for the same seed and range', async () => {
    const { random } = await loadRandom();
    expect(random('burst', 2, 8)).toBe(random('burst', 2, 8));
    expect(random(42, -5, 5)).toBe(random(42, -5, 5));
  });

  it('maps into [min, max)', async () => {
    const { random } = await loadRandom();
    for (let i = 0; i < 200; i++) {
      const value = random(`s${i}`, 10, 20);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThan(20);
    }
  });

  it('scales the same underlying value as random(seed): random(s, 0, 1) === random(s)', async () => {
    const { random } = await loadRandom();
    for (let i = 0; i < 50; i++) {
      expect(random(`s${i}`, 0, 1)).toBe(random(`s${i}`));
    }
  });

  it('returns min when the range is empty (min === max)', async () => {
    const { random } = await loadRandom();
    expect(random('still', 7, 7)).toBe(7);
  });

  it('returns different values for different seeds', async () => {
    const { random } = await loadRandom();
    const values = new Set(Array.from({ length: 50 }, (_, i) => random(`s${i}`, 0, 100)));
    expect(values.size).toBe(50);
  });

  it('throws a helpful error for a non-finite or inverted range', async () => {
    const { random } = await loadRandom();
    expect(() => random('s', Number.NaN, 1)).toThrow(/min must be a finite number/);
    expect(() => random('s', 0, Number.POSITIVE_INFINITY)).toThrow(/max must be a finite number/);
    expect(() => random('s', 5, 1)).toThrow(/min \(5\) must not be greater than max \(1\)/);
  });
});

describe('randomInt (BF-400)', () => {
  it('is deterministic for the same seed and range', async () => {
    const { randomInt } = await loadRandom();
    expect(randomInt('die', 1, 6)).toBe(randomInt('die', 1, 6));
    expect(randomInt(7, 0, 9)).toBe(randomInt(7, 0, 9));
  });

  it('returns integers within [min, max] inclusive', async () => {
    const { randomInt } = await loadRandom();
    for (let i = 0; i < 200; i++) {
      const value = randomInt(`s${i}`, 1, 6);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });

  it('can return both bounds (the range is inclusive)', async () => {
    const { randomInt } = await loadRandom();
    const values = new Set(Array.from({ length: 200 }, (_, i) => randomInt(`s${i}`, 1, 6)));
    expect(values.has(1)).toBe(true);
    expect(values.has(6)).toBe(true);
  });

  it('throws a helpful error for a non-finite or inverted range', async () => {
    const { randomInt } = await loadRandom();
    expect(() => randomInt('s', Number.NaN, 1)).toThrow(/min must be a finite number/);
    expect(() => randomInt('s', 0, Number.POSITIVE_INFINITY)).toThrow(/max must be a finite number/);
    expect(() => randomInt('s', 5, 1)).toThrow(/min \(5\) must not be greater than max \(1\)/);
  });
});

describe('randomPick (BF-400)', () => {
  it('is deterministic for the same seed', async () => {
    const { randomPick } = await loadRandom();
    const items = ['cut', 'dissolve', 'wipe'] as const;
    expect(randomPick('transition', items)).toBe(randomPick('transition', items));
  });

  it('returns an element of the given items', async () => {
    const { randomPick } = await loadRandom();
    const items = ['a', 'b', 'c', 'd'] as const;
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(randomPick(`s${i}`, items));
    }
  });

  it('can return every item (no dead entries)', async () => {
    const { randomPick } = await loadRandom();
    const items = ['a', 'b', 'c', 'd'] as const;
    const picked = new Set(Array.from({ length: 100 }, (_, i) => randomPick(`s${i}`, items)));
    for (const item of items) {
      expect(picked.has(item)).toBe(true);
    }
  });

  it('throws a helpful error for an empty items array', async () => {
    const { randomPick } = await loadRandom();
    expect(() => randomPick('s', [])).toThrow(/items must be a non-empty array/);
  });
});
