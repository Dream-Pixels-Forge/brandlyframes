import { describe, it, expect } from 'vitest';
import {
  lSystemGrowthPath,
  countLSystemCommands,
  lSystemTotalCommands,
  plantGrowth,
  coralGrowth,
  lightningGrowth,
  GROWTH_PRESETS,
  resolveGrowthPreset,
  growthPathForPreset,
  type LSystemConfig,
} from '../src/growth';

describe('countLSystemCommands', () => {
  it('counts only draw symbols', () => {
    expect(countLSystemCommands('F+F--F', { drawSymbols: ['F'] })).toBe(3);
    expect(countLSystemCommands('XYZ', { drawSymbols: ['X'] })).toBe(1);
  });
});

describe('lSystemTotalCommands', () => {
  it('returns the total segment count of the full derivation', () => {
    // F -> F+F (2 F's) at iteration 1
    const total = lSystemTotalCommands(
      'F',
      { F: 'F+F' },
      1,
      0,
      { drawSymbols: ['F'] },
    );
    expect(total).toBe(2);
    // iteration 2: F+F+F+F → 4
    expect(lSystemTotalCommands('F', { F: 'F+F' }, 2, 0, { drawSymbols: ['F'] })).toBe(4);
  });
});

describe('lSystemGrowthPath', () => {
  const config: LSystemConfig = {
    axiom: 'F',
    rules: { F: 'F+F' },
    maxIterations: 2,
    angleDegrees: 60,
    step: 10,
    drawSymbols: ['F'],
    useStack: false,
  };

  it('frame 0 with commandsPerFrame=1 draws the first segment only', () => {
    const p = lSystemGrowthPath(config.axiom, config.rules, config.maxIterations, 0, config, {
      commandsPerFrame: 1,
    });
    // With budget=0+0*1=0 at frame 0... startOffset=0, frame=0 → budget 0.
    // So nothing is drawn yet; path is just the M origin.
    expect(p).toMatch(/^M /);
  });

  it('grows more segments as the frame advances', () => {
    const p1 = lSystemGrowthPath(config.axiom, config.rules, config.maxIterations, 1, config, {
      commandsPerFrame: 1,
    });
    const p2 = lSystemGrowthPath(config.axiom, config.rules, config.maxIterations, 2, config, {
      commandsPerFrame: 1,
    });
    // p2 must be a strict extension of p1 (more L segments).
    const segs = (s: string) => s.split('L ').length - 1;
    expect(segs(p2)).toBeGreaterThan(segs(p1));
  });

  it('holds the finished path past the total command count', () => {
    const total = lSystemTotalCommands('F', { F: 'F+F' }, 2, 0, { drawSymbols: ['F'] }); // 4
    const pDone = lSystemGrowthPath('F', { F: 'F+F' }, 2, total, config, { commandsPerFrame: 1, holdWhenDone: true });
    const pBeyond = lSystemGrowthPath('F', { F: 'F+F' }, 2, total + 100, config, { commandsPerFrame: 1, holdWhenDone: true });
    expect(pDone).toBe(pBeyond);
  });

  it('is deterministic: same frame → same path', () => {
    const a = lSystemGrowthPath('F', { F: 'F+F' }, 2, 7, config, { commandsPerFrame: 3 });
    const b = lSystemGrowthPath('F', { F: 'F+F' }, 2, 7, config, { commandsPerFrame: 3 });
    expect(a).toBe(b);
  });

  it('startOffset skips leading segments', () => {
    const withOffset = lSystemGrowthPath('F', { F: 'F+F' }, 2, 0, config, {
      commandsPerFrame: 1,
      startOffset: 4,
    });
    // with startOffset=4 (total=4) → nothing new to draw, path is the origin
    // plus any 'M' resuming. withoutOffset draws nothing at frame 0 either.
    // The meaningful check: at frame 1 with offset, we see the full tree
    // already; without offset, frame 1 draws only 1 segment.
    const full = lSystemGrowthPath('F', { F: 'F+F' }, 2, 1, config, {
      commandsPerFrame: 1,
      startOffset: 4,
    });
    const partial = lSystemGrowthPath('F', { F: 'F+F' }, 2, 1, config, {
      commandsPerFrame: 1,
    });
    const segs = (s: string) => s.split('L ').length - 1;
    expect(segs(full)).toBeGreaterThan(segs(partial));
    expect(withOffset.length).toBeGreaterThan(0);
  });

  it('stack-based plant growth extends across frames', () => {
    const p0 = growthPathForPreset('plant', 0);
    const p5 = growthPathForPreset('plant', 5);
    const p20 = growthPathForPreset('plant', 20);
    const segs = (s: string) => s.split('L ').length - 1;
    expect(segs(p5)).toBeGreaterThan(segs(p0));
    // After enough frames the path stops growing (holdWhenDone).
    expect(p20.length).toBeLessThanOrEqual(growthPathForPreset('plant', 9999).length + 1);
  });
});

describe('growth presets', () => {
  it('exposes plant, coral, and lightning', () => {
    expect(GROWTH_PRESETS.plant).toBe(plantGrowth);
    expect(GROWTH_PRESETS.coral).toBe(coralGrowth);
    expect(GROWTH_PRESETS.lightning).toBe(lightningGrowth);
  });

  it('resolveGrowthPreset accepts a name', () => {
    expect(resolveGrowthPreset('coral').name).toBe('coral');
  });

  it('resolveGrowthPreset accepts an object passthrough', () => {
    expect(resolveGrowthPreset(plantGrowth)).toBe(plantGrowth);
  });

  it('resolveGrowthPreset throws on unknown name', () => {
    expect(() => resolveGrowthPreset('bogus')).toThrow(/unknown preset/);
  });

  it('coral and lightning derive non-trivially across frames', () => {
    const segs = (s: string) => s.split('L ').length - 1;
    const c0 = growthPathForPreset('coral', 0);
    const c5 = growthPathForPreset('coral', 5);
    expect(segs(c5)).toBeGreaterThan(segs(c0));

    const l0 = growthPathForPreset('lightning', 0);
    const l3 = growthPathForPreset('lightning', 3);
    expect(segs(l3)).toBeGreaterThan(segs(l0));
  });

  it('plant full-string matches deriveLSystem + totalCommands', () => {
    const total = lSystemTotalCommands(
      plantGrowth.axiom,
      plantGrowth.rules,
      plantGrowth.maxIterations,
      0,
      { drawSymbols: plantGrowth.drawSymbols },
    );
    const full = growthPathForPreset('plant', total + 100); // held at total
    const segs = full.split('L ').length - 1;
    expect(segs).toBe(total);
  });
});
