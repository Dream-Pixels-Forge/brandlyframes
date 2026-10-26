import { describe, it, expect } from 'vitest';
import {
  bezierEasing,
  sampleKeyframeTrack,
  upsertKeyframe,
  moveKeyframe,
  removeKeyframe,
  type Keyframe,
  type KeyframeTrack,
} from '../../src/timeline/keyframe-model';

const track = (frames: Keyframe[]): KeyframeTrack => ({
  clipId: 'clip-1',
  property: 'opacity',
  frames,
});

const kf = (id: string, t: number, value: number, easing: Keyframe['easing'] = 'linear'): Keyframe => ({
  id,
  t,
  value,
  easing,
});

describe('bezierEasing', () => {
  it('identity bezier (0,0,1,1) returns t', () => {
    const f = bezierEasing([0, 0, 1, 1]);
    expect(f(0)).toBe(0);
    expect(f(1)).toBe(1);
    expect(f(0.5)).toBeCloseTo(0.5, 3);
  });

  it('easeIn (0.42, 0, 1, 1) starts slow', () => {
    const f = bezierEasing([0.42, 0, 1, 1]);
    expect(f(0.25)).toBeLessThan(0.25);
    expect(f(0.75)).toBeLessThan(0.75); // easeIn: still below the diagonal at t=0.75
    expect(f(1)).toBe(1);
  });

  it('clamps outside [0,1]', () => {
    const f = bezierEasing([0.4, 0, 0.2, 1]);
    expect(f(-0.5)).toBe(0);
    expect(f(1.5)).toBe(1);
  });
});

describe('sampleKeyframeTrack', () => {
  it('returns first value before first keyframe', () => {
    const tr = track([kf('a', 0.2, 0), kf('b', 1, 1)]);
    expect(sampleKeyframeTrack(tr, 0)).toBe(0);
  });

  it('returns last value after last keyframe', () => {
    const tr = track([kf('a', 0, 0), kf('b', 0.8, 1)]);
    expect(sampleKeyframeTrack(tr, 1)).toBe(1);
  });

  it('linear interpolation between two keyframes', () => {
    const tr = track([kf('a', 0, 0), kf('b', 1, 10)]);
    expect(sampleKeyframeTrack(tr, 0.5)).toBeCloseTo(5, 5);
    expect(sampleKeyframeTrack(tr, 0.25)).toBeCloseTo(2.5, 5);
  });

  it('bezier easing affects mid-segment value', () => {
    // easeOut (fast start, slow finish): value leads the linear midpoint.
    const tr = track([
      { ...kf('a', 0, 0, 'bezier'), bezier: [0, 0, 0.58, 1] }, // easeOut
      kf('b', 1, 10),
    ]);
    const linearVal = 5;
    const bezierVal = sampleKeyframeTrack(tr, 0.5);
    expect(bezierVal).toBeGreaterThan(linearVal); // easeOut is ahead at t=0.5
    // easeIn lags the linear midpoint instead.
    const trIn = track([
      { ...kf('a', 0, 0, 'bezier'), bezier: [0.42, 0, 1, 1] },
      kf('b', 1, 10),
    ]);
    expect(sampleKeyframeTrack(trIn, 0.5)).toBeLessThan(linearVal);
  });

  it('empty track returns 0', () => {
    expect(sampleKeyframeTrack(track([]), 0.5)).toBe(0);
  });

  it('deterministic: same input → same output', () => {
    const tr = track([kf('a', 0, 0), kf('b', 0.5, 5), kf('c', 1, 10)]);
    const a = sampleKeyframeTrack(tr, 0.3);
    const b = sampleKeyframeTrack(tr, 0.3);
    expect(a).toBe(b);
  });
});

describe('upsertKeyframe / moveKeyframe / removeKeyframe', () => {
  it('upsert inserts in sorted order by t', () => {
    let tr = track([kf('a', 0, 0), kf('b', 1, 1)]);
    tr = upsertKeyframe(tr, kf('mid', 0.5, 5));
    expect(tr.frames.map((f) => f.id)).toEqual(['a', 'mid', 'b']);
  });

  it('upsert replaces existing id without duplicating', () => {
    let tr = track([kf('a', 0, 0), kf('b', 1, 1)]);
    tr = upsertKeyframe(tr, { ...kf('b', 1, 1), value: 99 });
    expect(tr.frames.length).toBe(2);
    expect(tr.frames[1].value).toBe(99);
  });

  it('moveKeyframe clamps to [0,1]', () => {
    let tr = track([kf('a', 0.2, 0), kf('b', 0.8, 1)]);
    tr = moveKeyframe(tr, 'a', -1);
    expect(tr.frames[0].t).toBe(0);
    tr = moveKeyframe(tr, 'b', 5);
    expect(tr.frames[1].t).toBe(1);
  });

  it('removeKeyframe removes by id', () => {
    let tr = track([kf('a', 0, 0), kf('b', 0.5, 5), kf('c', 1, 1)]);
    tr = removeKeyframe(tr, 'b');
    expect(tr.frames.map((f) => f.id)).toEqual(['a', 'c']);
  });
});
