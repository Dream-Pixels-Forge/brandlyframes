import { describe, expect, it } from 'vitest';
import { computeCameraTransform } from '../src/camera-transform';
import type { CameraMoveConfig, DollyMove, PanMove, ParallaxMove } from '../src/types';

const dolly: DollyMove = { mode: 'dolly', startFrame: 0, endFrame: 20, zoom: 2 };
const pan: PanMove = { mode: 'pan', startFrame: 0, endFrame: 20, panX: 100, panY: 50 };
const parallax: ParallaxMove = { mode: 'parallax', startFrame: 0, endFrame: 20, panX: 100, panY: 0, depth: 2 };

describe('computeCameraTransform — dolly (zoom in/out)', () => {
  it('starts at scale 1, reaches `zoom` at endFrame, interpolates linearly in between', () => {
    expect(computeCameraTransform(0, dolly)).toMatchObject({
      frame: 0,
      progress: 0,
      mode: 'dolly',
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    });
    expect(computeCameraTransform(10, dolly)).toMatchObject({ progress: 0.5, scaleX: 1.5, scaleY: 1.5 });
    expect(computeCameraTransform(20, dolly)).toMatchObject({ frame: 20, progress: 1, scaleX: 2, scaleY: 2 });
  });

  it('clamps to the start value before the range and to `zoom` after it', () => {
    expect(computeCameraTransform(-5, dolly).scaleX).toBe(1);
    expect(computeCameraTransform(100, dolly).scaleX).toBe(2);
  });

  it('dolly never translates', () => {
    for (const frame of [-10, 0, 7, 20, 100]) {
      expect(computeCameraTransform(frame, dolly).translateX).toBe(0);
      expect(computeCameraTransform(frame, dolly).translateY).toBe(0);
    }
  });
});

describe('computeCameraTransform — pan (horizontal/vertical movement)', () => {
  it('translates linearly across the range with no scale change', () => {
    expect(computeCameraTransform(0, pan)).toMatchObject({ progress: 0, translateX: 0, translateY: 0, scaleX: 1, scaleY: 1 });
    expect(computeCameraTransform(10, pan)).toMatchObject({ progress: 0.5, translateX: 50, translateY: 25 });
    expect(computeCameraTransform(20, pan)).toMatchObject({ progress: 1, translateX: 100, translateY: 50 });
  });

  it('clamps outside the range', () => {
    expect(computeCameraTransform(-3, pan).translateX).toBe(0);
    expect(computeCameraTransform(100, pan)).toMatchObject({ translateX: 100, translateY: 50 });
  });
});

describe('computeCameraTransform — parallax (layered depth movement)', () => {
  it('scales the pan by `depth`, so deeper layers move slower', () => {
    const near = { ...parallax, depth: 2 };
    const far = { ...parallax, depth: 0.5 };
    expect(computeCameraTransform(10, near)).toMatchObject({ progress: 0.5, translateX: 100, translateY: 0 });
    expect(computeCameraTransform(10, far)).toMatchObject({ progress: 0.5, translateX: 25, translateY: 0 });
    expect(computeCameraTransform(20, parallax)).toMatchObject({ translateX: 200, translateY: 0, scaleX: 1, scaleY: 1 });
  });
});

describe('computeCameraTransform — modes and determinism', () => {
  const move: CameraMoveConfig = { mode: 'pan', startFrame: 0, endFrame: 10, panX: 40, panY: 0 };

  it('is deterministic: identical input always yields identical output', () => {
    const a = computeCameraTransform(7, move);
    const b = computeCameraTransform(7, move);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('produces a different transform per frame', () => {
    const frames = [0, 1, 2, 5, 10].map((frame) => computeCameraTransform(frame, move));
    const translates = frames.map((t) => `${t.translateX},${t.translateY}`);
    expect(new Set(translates).size).toBe(frames.length);
  });

  it('different modes differ at the same frame', () => {
    const d = computeCameraTransform(5, dolly);
    const p = computeCameraTransform(5, pan);
    expect(d.scaleX).not.toBe(p.scaleX);
    expect(d.translateX).not.toBe(p.translateX);
    expect(d.rotation).toBe(p.rotation);
  });
});
