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
