import { describe, expect, it } from 'vitest';
import {
  buildBrollPlan,
  resolveBrollClip,
  weaveBroll,
  DEFAULT_KEYWORD_TABLE,
  type BrollClip,
  type MainSegment,
} from '../src/broll';

describe('buildBrollPlan', () => {
  it('maps known keywords to their table generators + seeds', () => {
    const plan = buildBrollPlan(['ocean', 'city']);
    expect(plan.clips[0]?.generator).toBe('terrain');
    expect(plan.clips[0]?.seed).toBe(DEFAULT_KEYWORD_TABLE.ocean?.seed);
    expect(plan.clips[1]?.generator).toBe('cellular');
  });

  it('falls back to the default generator with a keyword-derived seed for unknowns', () => {
    const plan = buildBrollPlan(['dragonfruit']);
    expect(plan.clips[0]?.generator).toBe('fractal');
    // Deterministic: same keyword → same seed (two independent builds).
    const plan2 = buildBrollPlan(['dragonfruit']);
    expect(plan.clips[0]?.seed).toBe(plan2.clips[0]?.seed);
    expect(plan.clips[0]?.seed).not.toBe(0);
  });

  it('places clips back-to-back with the configured gap', () => {
    const plan = buildBrollPlan(['a', 'b', 'c'], { clipLength: 30, gap: 5 });
    expect(plan.clips[0]?.startFrame).toBe(0);
    expect(plan.clips[0]?.endFrame).toBe(30);
    expect(plan.clips[1]?.startFrame).toBe(35);
    expect(plan.clips[1]?.endFrame).toBe(65);
    expect(plan.timelineLength).toBe(100);
  });

  it('normalizes keywords to lowercase and trims', () => {
    const plan = buildBrollPlan(['  Ocean ']);
    expect(plan.clips[0]?.keyword).toBe('ocean');
  });

  it('handles an empty keyword list', () => {
    const plan = buildBrollPlan([]);
    expect(plan.clips).toHaveLength(0);
    expect(plan.timelineLength).toBe(0);
  });

  it('is deterministic: same keywords → same plan', () => {
    const a = buildBrollPlan(['ocean', 'city', 'forest']);
    const b = buildBrollPlan(['ocean', 'city', 'forest']);
    expect(a).toEqual(b);
  });
});

describe('resolveBrollClip', () => {
  const clip: BrollClip = {
    keyword: 'ocean',
    generator: 'terrain',
    seed: 123,
    startFrame: 0,
    endFrame: 60,
  };

  it('resolves a terrain clip to a TerrainConfig with defaults', () => {
    const r = resolveBrollClip(clip);
    expect(r.kind).toBe('terrain');
    if (r.kind === 'terrain') {
      expect(typeof r.config.scale).toBe('number');
    }
  });

  it('resolves a fractal clip with a custom type override', () => {
    const r = resolveBrollClip({ ...clip, generator: 'fractal', options: { type: 'julia' } });
    expect(r.kind).toBe('fractal');
    if (r.kind === 'fractal') {
      expect(r.config.type).toBe('julia');
      expect(r.config.seed).toBe(123);
    }
  });

  it('resolves a cellular clip with a Game of Life rule', () => {
    const r = resolveBrollClip({ ...clip, generator: 'cellular' });
    expect(r.kind).toBe('cellular');
  });

  it('throws on an unknown generator', () => {
    const bad = { ...clip, generator: 'nope' as never };
    expect(() => resolveBrollClip(bad)).toThrow(/unknown generator/);
  });
});

describe('weaveBroll', () => {
  const mains: MainSegment[] = [
    { label: 'intro', startFrame: 0, endFrame: 100 },
    { label: 'outro', startFrame: 100, endFrame: 200 },
  ];

  it('inserts a B-roll clip after the main segment it follows', () => {
    const plan = buildBrollPlan(['ocean']);
    const woven = weaveBroll(mains, plan);
    // intro (0-100) → broll:ocean (100-160) → outro (160-260).
    expect(woven.segments[0]?.label).toBe('intro');
    expect(woven.segments[1]?.label).toBe('broll:ocean');
    expect(woven.segments[1]?.startFrame).toBe(100);
    expect(woven.segments[2]?.label).toBe('outro');
    expect(woven.totalFrames).toBe(260);
  });

  it('shifts later main segments to make room for inserts', () => {
    const plan = buildBrollPlan(['ocean', 'city']);
    const woven = weaveBroll(mains, plan);
    // intro → broll:ocean → outro → broll:city
    expect(woven.segments.map((s) => s.label)).toEqual([
      'intro',
      'broll:ocean',
      'outro',
      'broll:city',
    ]);
  });

  it('respects an explicit keyword → main-index mapping', () => {
    const plan = buildBrollPlan(['ocean']);
    // Force the ocean clip to follow main segment index 1 (outro) instead of 0.
    const woven = weaveBroll(mains, plan, { ocean: '1' });
    const labels = woven.segments.map((s) => s.label);
    expect(labels).toEqual(['intro', 'outro', 'broll:ocean']);
  });

  it('is deterministic: same mains + plan → same timeline', () => {
    const plan = buildBrollPlan(['ocean', 'city']);
    const a = weaveBroll(mains, plan);
    const b = weaveBroll(mains, plan);
    expect(a).toEqual(b);
  });
});
