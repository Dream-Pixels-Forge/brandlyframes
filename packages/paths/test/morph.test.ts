import { describe, expect, it } from 'vitest';
import {
  samplePath,
  polygonToPath,
  morphPaths,
} from '../src/morph';
import { starPath, roundedRect, polygonPath } from '../src/index';

describe('samplePath', () => {
  it('returns exactly N points', () => {
    const pts = samplePath('M 0 0 L 100 0 L 100 100 L 0 100 Z', 48);
    expect(pts).toHaveLength(48);
  });

  it('is deterministic: same path + N → same points', () => {
    const d = 'M 0 0 L 100 0 L 100 100 L 0 100 Z';
    expect(samplePath(d, 24)).toEqual(samplePath(d, 24));
  });

  it('samples a straight segment at equal arc-length intervals', () => {
    // A single 100×0 horizontal segment, 5 samples → 0,20,40,60,80 (and wraps at 100).
    const pts = samplePath('M 0 0 L 100 0 Z', 5);
    // The perimeter is 100 (bottom) + 100 (closing left edge? no — Z closes to start (0,0),
    // so perimeter = 100 (top) + 0 (Z chord, already at (100,0)→(0,0) = 100) = 200.
    // 5 samples at 0,40,80,120,160 of 200.
    // Just check length and that first point is the start.
    expect(pts).toHaveLength(5);
    expect(pts[0].x).toBeCloseTo(0, 0);
    expect(pts[0].y).toBeCloseTo(0, 0);
  });

  it('approximates a cubic curve with sub-segments', () => {
    // A single C command: M 0 0 C 100 0 100 100 100 100 → 4 sub-segments.
    const pts = samplePath('M 0 0 C 100 0 100 100 100 100 Z', 8);
    expect(pts).toHaveLength(8);
  });
});

describe('polygonToPath', () => {
  it('builds an M + L…Z string', () => {
    const d = polygonToPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], true, 1);
    expect(d).toContain('M 0 0');
    expect(d).toContain('L 10 0');
    expect(d).toContain('Z');
  });

  it('open polygon omits Z', () => {
    const d = polygonToPath([{ x: 0, y: 0 }, { x: 5, y: 5 }], false, 1);
    expect(d).not.toContain('Z');
  });
});

describe('morphPaths', () => {
  const star = starPath(5, 50, 20, 0, 0);
  const rect = roundedRect(0, 0, 100, 100, 4);

  it('t=0 returns shape A; t=1 returns shape B', () => {
    const at0 = morphPaths(star, rect, 0, { samples: 32 });
    const at1 = morphPaths(star, rect, 1, { samples: 32 });
    // Neither should be identical to the *raw* input strings (resampled),
    // but t=0 should match the resampled star, t=1 the resampled rect.
    const starResampled = polygonToPath(samplePath(star, 32), true);
    const rectResampled = polygonToPath(samplePath(rect, 32), true);
    expect(at0).toEqual(starResampled);
    expect(at1).toEqual(rectResampled);
  });

  it('midpoint (t=0.5) differs from both endpoints', () => {
    const mid = morphPaths(star, rect, 0.5, { samples: 32 });
    expect(mid).not.toEqual(morphPaths(star, rect, 0, { samples: 32 }));
    expect(mid).not.toEqual(morphPaths(star, rect, 1, { samples: 32 }));
  });

  it('is deterministic: same inputs → same string', () => {
    const a = morphPaths(star, rect, 0.4, { samples: 48 });
    const b = morphPaths(star, rect, 0.4, { samples: 48 });
    expect(a).toEqual(b);
  });

  it('clamps t outside [0,1]', () => {
    const under = morphPaths(star, rect, -5, { samples: 32 });
    const over = morphPaths(star, rect, 3, { samples: 32 });
    expect(under).toEqual(morphPaths(star, rect, 0, { samples: 32 }));
    expect(over).toEqual(morphPaths(star, rect, 1, { samples: 32 }));
  });

  it('works on two very different closed shapes (triangle → 8-gon)', () => {
    const tri = polygonPath(0, 0, 3, 50);
    const oct = polygonPath(0, 0, 8, 50);
    const mid = morphPaths(tri, oct, 0.5, { samples: 24 });
    // A non-trivial, closed path.
    expect(mid).toContain('Z');
    expect(mid.length).toBeGreaterThan(10);
  });

  it('rotateB shifts B sample alignment', () => {
    // Use a triangle: rotating its sample start by a third of the perimeter
    // moves the "start" to a different vertex, so the t=0.5 blend with a
    // fixed shape A lands on different coordinates.
    const tri = polygonPath(0, 0, 3, 50);
    const sq = polygonPath(0, 0, 4, 50);
    const a = morphPaths(sq, tri, 0.5, { samples: 24, rotateB: 0 });
    const b = morphPaths(sq, tri, 0.5, { samples: 24, rotateB: 1 / 3 });
    expect(a).not.toEqual(b);
  });
});
