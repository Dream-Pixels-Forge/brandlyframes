/**
 * Terrain tests — [BF-513]
 */

import { describe, it, expect } from 'vitest';
import {
  getTerrainPoints,
  defaultTerrainConfig,
  type TerrainConfig,
} from '../src/terrain';

describe('defaultTerrainConfig', () => {
  it('has sensible defaults', () => {
    expect(defaultTerrainConfig.width).toBe(800);
    expect(defaultTerrainConfig.height).toBe(400);
    expect(defaultTerrainConfig.octaves).toBe(4);
    expect(defaultTerrainConfig.seed).toBe(0);
  });
});

describe('getTerrainPoints', () => {
  const config: TerrainConfig = {
    ...defaultTerrainConfig,
    width: 100,
    height: 50,
  };

  it('returns points starting at x=0', () => {
    const points = getTerrainPoints(config, 0);
    expect(points[0].x).toBe(0);
  });

  it('returns points ending at x=width (last sample point)', () => {
    const points = getTerrainPoints(config, 0);
    // Last sample point before closing points
    const lastSample = points[points.length - 3];
    expect(lastSample.x).toBe(config.width);
  });

  it('closes the path at the bottom', () => {
    const points = getTerrainPoints(config, 0);
    const last = points[points.length - 1];
    expect(last.y).toBe(config.height);
    // Closing order: bottom-right (width, height) then bottom-left (0, height)
    expect(points[points.length - 2].x).toBe(config.width);
    expect(points[points.length - 2].y).toBe(config.height);
    expect(points[points.length - 1].x).toBe(0);
    expect(points[points.length - 1].y).toBe(config.height);
  });

  it('is deterministic', () => {
    const a = getTerrainPoints(config, 42);
    const b = getTerrainPoints(config, 42);
    expect(a).toEqual(b);
  });

  it('changes across frames (animation)', () => {
    const a = getTerrainPoints(config, 0);
    const b = getTerrainPoints(config, 10);
    expect(a).not.toEqual(b);
  });

  it('all points are within bounds', () => {
    const points = getTerrainPoints(config, 0);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(config.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(config.height);
    }
  });
});
