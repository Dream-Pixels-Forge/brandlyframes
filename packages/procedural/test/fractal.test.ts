/**
 * Fractal tests — [BF-513]
 */

import { describe, it, expect } from 'vitest';
import {
  getFractalPoints,
  defaultFractalConfig,
  type FractalConfig,
} from '../src/fractal';

describe('defaultFractalConfig', () => {
  it('has sensible defaults', () => {
    expect(defaultFractalConfig.type).toBe('mandelbrot');
    expect(defaultFractalConfig.width).toBe(400);
    expect(defaultFractalConfig.height).toBe(400);
    expect(defaultFractalConfig.maxIterations).toBe(100);
  });
});

describe('getFractalPoints', () => {
  const config: FractalConfig = {
    ...defaultFractalConfig,
    width: 50,
    height: 50,
    maxIterations: 50,
  };

  it('returns points within bounds', () => {
    const points = getFractalPoints(config, 0);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(config.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(config.height);
    }
  });

  it('is deterministic', () => {
    const a = getFractalPoints(config, 10);
    const b = getFractalPoints(config, 10);
    expect(a).toEqual(b);
  });

  it('changes across frames (zoom animation)', () => {
    const a = getFractalPoints(config, 0);
    const b = getFractalPoints(config, 50);
    expect(a).not.toEqual(b);
  });

  it('returns non-empty points', () => {
    const points = getFractalPoints(config, 0);
    expect(points.length).toBeGreaterThan(0);
  });

  it('supports julia type', () => {
    const julia: FractalConfig = {
      ...config,
      type: 'julia',
      seed: 17,
    };
    const points = getFractalPoints(julia, 0);
    expect(points.length).toBeGreaterThan(0);
  });
});
