/**
 * Noise tests — [BF-070]
 */

import { describe, it, expect } from 'vitest';
import {
  noise1D,
  noise2D,
  noise3D,
  fbmNoise,
  turbulenceNoise,
  ridgedNoise,
  generateNoiseField,
  normalizeNoiseField,
  colorizeNoiseField,
} from '../src/index';

describe('Basic noise functions', () => {
  it('noise1D returns values in [0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const val = noise1D(i, 42);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('noise1D is deterministic with same seed', () => {
    expect(noise1D(10, 42)).toBe(noise1D(10, 42));
    expect(noise1D(10, 42)).not.toBe(noise1D(10, 43));
  });

  it('noise2D returns values in [0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const val = noise2D(i, i * 2, 42);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('noise3D returns values in [0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const val = noise3D(i, i, i, 42);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});

describe('fbmNoise', () => {
  it('returns values in [0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const val = fbmNoise(i * 0.1, i * 0.1, 4, 0.5, 2.0, 42);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('is deterministic with same parameters', () => {
    expect(fbmNoise(0.5, 0.5, 4, 0.5, 2.0, 42)).toBe(
      fbmNoise(0.5, 0.5, 4, 0.5, 2.0, 42)
    );
  });

  it('increases detail with more octaves', () => {
    const v1 = fbmNoise(0.5, 0.5, 1, 0.5, 2.0, 42);
    const v4 = fbmNoise(0.5, 0.5, 8, 0.5, 2.0, 42);
    expect(v1).not.toBe(v4);
  });
});

describe('turbulenceNoise', () => {
  it('returns positive values', () => {
    for (let i = 0; i < 100; i++) {
      const val = turbulenceNoise(i * 0.1, i * 0.1, 4, 42);
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('ridgedNoise', () => {
  it('returns positive values', () => {
    for (let i = 0; i < 100; i++) {
      const val = ridgedNoise(i * 0.1, i * 0.1, 4, 42);
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('generateNoiseField', () => {
  it('generates field of correct size', () => {
    const field = generateNoiseField({
      width: 10,
      height: 8,
      scale: 0.1,
      octaves: 2,
      seed: 42,
    });

    expect(field.length).toBe(8);
    expect(field[0].length).toBe(10);
  });

  it('returns values in [0, 1)', () => {
    const field = generateNoiseField({ width: 10, height: 10 });
    for (const row of field) {
      for (const val of row) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    }
  });

  it('different types produce different patterns', () => {
    const fbm = generateNoiseField({ width: 10, height: 10, type: 'fbm', seed: 42 });
    const turb = generateNoiseField({ width: 10, height: 10, type: 'turbulence', seed: 42 });
    const ridged = generateNoiseField({ width: 10, height: 10, type: 'ridged', seed: 42 });

    // They should be different
    let same = true;
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (fbm[y][x] !== turb[y][x] || fbm[y][x] !== ridged[y][x]) {
          same = false;
          break;
        }
      }
    }
    expect(same).toBe(false);
  });
});

describe('normalizeNoiseField', () => {
  it('normalizes to [0, 1]', () => {
    const field = [
      [0, 0.5, 1],
      [0.2, 0.5, 0.8],
    ];
    const normalized = normalizeNoiseField(field);
    expect(normalized[0][0]).toBe(0);
    expect(normalized[0][2]).toBe(1);
    expect(normalized[1][1]).toBe(0.5);
  });

  it('handles constant field', () => {
    const field = [
      [0.5, 0.5],
      [0.5, 0.5],
    ];
    const normalized = normalizeNoiseField(field);
    expect(normalized[0][0]).toBe(0.5);
    expect(normalized[1][1]).toBe(0.5);
  });
});

describe('colorizeNoiseField', () => {
  it('maps values to colors', () => {
    const field = [
      [0, 0.5, 1],
      [0.25, 0.5, 0.75],
    ];
    const colorStops = [
      { position: 0, color: '#000000' },
      { position: 1, color: '#FFFFFF' },
    ];
    const colored = colorizeNoiseField(field, colorStops);

    expect(colored[0][0]).toBe('rgba(0, 0, 0, 1)');
    expect(colored[0][2]).toBe('rgba(255, 255, 255, 1)');
  });

  it('handles multiple color stops', () => {
    const field = [[0, 0.5, 1]];
    const colorStops = [
      { position: 0, color: '#FF0000' },
      { position: 0.5, color: '#00FF00' },
      { position: 1, color: '#0000FF' },
    ];
    const colored = colorizeNoiseField(field, colorStops);
    expect(colored[0][0]).toContain('255, 0, 0');
    expect(colored[0][2]).toContain('0, 0, 255');
  });
});
