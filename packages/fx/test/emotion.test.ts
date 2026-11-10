import { describe, expect, it } from 'vitest';
import {
  sampleEmotionCurve,
  emotionLut,
  emotionTreatment,
  applyEmotionFrame,
  emotionAtFrame,
  type EmotionCurve,
  type FramePixels,
} from '../src/emotion';

const W = 8;
const H = 8;
const N = W * H * 4;

const greyFrame = (): FramePixels => {
  const d = new Uint8ClampedArray(N);
  for (let i = 0; i < N; i += 4) {
    d[i] = 128;
    d[i + 1] = 128;
    d[i + 2] = 128;
    d[i + 3] = 255;
  }
  return d;
};

const curve: EmotionCurve = {
  points: [
    { frame: 0, valence: -0.8, arousal: -0.6 },
    { frame: 30, valence: 0, arousal: 0 },
    { frame: 60, valence: 0.9, arousal: 0.8 },
  ],
};

describe('sampleEmotionCurve', () => {
  it('clamps to the first sample before it', () => {
    const s = sampleEmotionCurve(curve, -10);
    expect(s.valence).toBeCloseTo(-0.8);
    expect(s.arousal).toBeCloseTo(-0.6);
  });

  it('clamps to the last sample after it', () => {
    const s = sampleEmotionCurve(curve, 999);
    expect(s.valence).toBeCloseTo(0.9);
    expect(s.arousal).toBeCloseTo(0.8);
  });

  it('interpolates linearly between midpoints', () => {
    const s = sampleEmotionCurve(curve, 15);
    // Halfway between frame 0 (-0.8) and frame 30 (0).
    expect(s.valence).toBeCloseTo(-0.4);
    expect(s.arousal).toBeCloseTo(-0.3);
  });

  it('handles an empty curve (returns neutral)', () => {
    const s = sampleEmotionCurve({ points: [] }, 5);
    expect(s).toEqual({ valence: 0, arousal: 0 });
  });

  it('is deterministic', () => {
    expect(sampleEmotionCurve(curve, 45)).toEqual(sampleEmotionCurve(curve, 45));
  });
});

describe('emotionLut', () => {
  it('produces a valid 256-entry table in [0,1]', () => {
    const lut = emotionLut(0, 0);
    expect(lut.size).toBe(256);
    for (const v of lut.data) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    // Neutral mood: shadows stay near 0, highlights near 1.
    expect(lut.data[0]).toBeLessThan(0.05);
    expect(lut.data[255]).toBeGreaterThan(0.95);
  });

  it('high arousal increases contrast (deeper shadows, hotter highlights)', () => {
    const calm = emotionLut(0, -1);
    const intense = emotionLut(0, 1);
    // At 50%: calm should be pulled toward neutral (0.5), intense should be at 0.5
    // (the S-curve pivot). Compare at 25% and 75%.
    const calmLow = calm.data[64]; // 25%
    const intenseLow = intense.data[64];
    const calmHigh = calm.data[192]; // 75%
    const intenseHigh = intense.data[192];
    expect(intenseLow).toBeLessThan(calmLow);
    expect(intenseHigh).toBeGreaterThan(calmHigh);
  });

  it('positive valence warms the highlights relative to negative', () => {
    const warm = emotionLut(1, 0);
    const cool = emotionLut(-1, 0);
    expect(warm.data[240]).toBeGreaterThan(cool.data[240]);
  });

  it('is deterministic', () => {
    expect(emotionLut(0.3, -0.4)).toEqual(emotionLut(0.3, -0.4));
  });
});

describe('emotionTreatment', () => {
  it('speed multiplier is 1 at neutral arousal, scales to 0.75/1.25', () => {
    expect(emotionTreatment({ valence: 0, arousal: 0 }).speedMultiplier).toBe(1);
    expect(emotionTreatment({ valence: 0, arousal: -1 }).speedMultiplier).toBeCloseTo(0.75);
    expect(emotionTreatment({ valence: 0, arousal: 1 }).speedMultiplier).toBeCloseTo(1.25);
  });

  it('typography weight scales with arousal (400 neutral)', () => {
    expect(emotionTreatment({ valence: 0, arousal: 0 }).typographyWeight).toBe(400);
    expect(emotionTreatment({ valence: 0, arousal: 1 }).typographyWeight).toBe(700);
    expect(emotionTreatment({ valence: 0, arousal: -1 }).typographyWeight).toBe(100);
  });

  it('returns the sample for reference', () => {
    const t = emotionTreatment({ valence: 0.5, arousal: -0.5 });
    expect(t.sample.valence).toBe(0.5);
    expect(t.sample.arousal).toBe(-0.5);
  });
});

describe('applyEmotionFrame', () => {
  it('is deterministic: same frame + curve → byte-identical output', () => {
    const src = greyFrame();
    const a = applyEmotionFrame(src, W, H, curve, 15);
    const b = applyEmotionFrame(src, W, H, curve, 15);
    expect(a).toEqual(b);
  });

  it('different frames on a curve produce different grades', () => {
    const src = greyFrame();
    const f0 = applyEmotionFrame(src, W, H, curve, 0);
    const f60 = applyEmotionFrame(src, W, H, curve, 60);
    expect(f0).not.toEqual(f60);
  });

  it('does not mutate the input', () => {
    const src = greyFrame();
    const before = new Uint8ClampedArray(src);
    applyEmotionFrame(src, W, H, curve, 30);
    expect(src).toEqual(before);
  });

  it('flat neutral curve is ~identity on a mid-grey frame', () => {
    const flat: EmotionCurve = { points: [{ frame: 0 }] };
    const src = greyFrame();
    const out = applyEmotionFrame(src, W, H, flat, 0);
    // Near-identity: each byte within a small tolerance of 128.
    for (let i = 0; i < N; i += 4) {
      expect(Math.abs(out[i] - 128)).toBeLessThan(16);
    }
  });
});

describe('emotionAtFrame', () => {
  it('combines sample + treatment in one call', () => {
    const t = emotionAtFrame(curve, 60);
    expect(t.sample.valence).toBeCloseTo(0.9);
    expect(t.speedMultiplier).toBeGreaterThan(1);
    expect(t.lut.size).toBe(256);
  });
});
