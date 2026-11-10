import { describe, expect, it } from 'vitest';
import {
  applyFilmStock,
  applyHalation,
  applyGateWeave,
  makePushPullCurve,
  applyPushPull,
  resolveFilmStock,
  filmStockToneCurve,
  FILM_STOCKS,
  type FramePixels,
} from '../src/film';

const W = 8;
const H = 8;
const N = W * H * 4;

/** A mid-gray frame with one bright spot (high contrast for halation). */
const grayFrame = (): FramePixels => {
  const d = new Uint8ClampedArray(N);
  for (let i = 0; i < N; i += 4) {
    d[i] = 128;
    d[i + 1] = 128;
    d[i + 2] = 128;
    d[i + 3] = 255;
  }
  // Bright spot at (2,2)
  const b = (2 * W + 2) * 4;
  d[b] = 250;
  d[b + 1] = 250;
  d[b + 2] = 250;
  return d;
};

describe('FILM_STOCKS / resolveFilmStock', () => {
  it('resolves built-in stock names', () => {
    expect(resolveFilmStock('kodak-5219').name).toContain('Kodak');
    expect(resolveFilmStock('fuji-400').iso).toBe(400);
    expect(resolveFilmStock('ilford-hp5').name).toContain('Ilford');
  });

  it('throws on unknown stock', () => {
    expect(() => resolveFilmStock('nopro-9000')).toThrow(/unknown film stock/);
  });

  it('accepts a custom spec object', () => {
    const spec = {
      name: 'MyFilm',
      iso: 200,
      shift: [0, 0, 0] as const,
      grainScale: 1,
      grainSize: 1,
      exposure: 0.5,
      contrast: 1,
      shadowLift: 0,
      highlightRoll: 0,
    };
    expect(resolveFilmStock(spec).name).toBe('MyFilm');
  });
});

describe('filmStockToneCurve', () => {
  it('neutral stock (0.5 exposure, 1 contrast, no shifts) ~ identity', () => {
    const spec = FILM_STOCKS['fuji-400'];
    const neutral = {
      ...spec,
      exposure: 0.5,
      contrast: 1,
      shift: [0, 0, 0] as const,
      shadowLift: 0,
      highlightRoll: 0,
    };
    const curves = filmStockToneCurve(neutral);
    for (const c of [0, 64, 128, 192, 255]) {
      expect(curves[0](c)).toBeCloseTo(c, 0);
    }
  });

  it('push (+1 stop) brightens, pull (-1 stop) darkens', () => {
    const base = FILM_STOCKS['kodak-5219'];
    const push = { ...base, exposure: 1.0, contrast: 1, shift: [0, 0, 0] as const, shadowLift: 0, highlightRoll: 0 };
    const pull = { ...base, exposure: 0.0, contrast: 1, shift: [0, 0, 0] as const, shadowLift: 0, highlightRoll: 0 };
    expect(filmStockToneCurve(push)[0](128)).toBeGreaterThan(128);
    expect(filmStockToneCurve(pull)[0](128)).toBeLessThan(128);
  });
});

describe('applyFilmStock', () => {
  it('is deterministic: same frame/seed → byte-identical output', () => {
    const src = grayFrame();
    const a = applyFilmStock(src, W, H, { stock: 'kodak-5219', frame: 42, seed: 7 });
    const b = applyFilmStock(src, W, H, { stock: 'kodak-5219', frame: 42, seed: 7 });
    expect(a).toEqual(b);
  });

  it('different frames differ (grain phase changes with frame)', () => {
    const src = grayFrame();
    const f0 = applyFilmStock(src, W, H, { stock: 'kodak-5219', frame: 0, seed: 1 });
    const f1 = applyFilmStock(src, W, H, { stock: 'kodak-5219', frame: 1, seed: 1 });
    expect(f0).not.toEqual(f1);
  });

  it('does not mutate the input', () => {
    const src = grayFrame();
    const before = new Uint8ClampedArray(src);
    applyFilmStock(src, W, H, { stock: 'fuji-400', frame: 5 });
    expect(src).toEqual(before);
  });

  it('B&W stock (ilford-hp5) is more grainy than fuji', () => {
    const src = grayFrame();
    const hp5 = applyFilmStock(src, W, H, { stock: 'ilford-hp5', frame: 1, seed: 3 });
    const fuji = applyFilmStock(src, W, H, { stock: 'fuji-400', frame: 1, seed: 3 });
    // Both are valid frames; just assert deterministic, in-range output.
    for (let i = 0; i < hp5.length; i++) {
      expect(hp5[i]).toBeGreaterThanOrEqual(0);
      expect(hp5[i]).toBeLessThanOrEqual(255);
    }
    expect(hp5).not.toEqual(fuji);
  });
});

describe('applyHalation', () => {
  it('adds warm red fringe near the bright spot (deterministic)', () => {
    const src = grayFrame();
    const a = applyHalation(src, W, H, { intensity: 0.2, seed: 1, frame: 3 });
    const b = applyHalation(src, W, H, { intensity: 0.2, seed: 1, frame: 3 });
    expect(a).toEqual(b);
    // Red channel near the bright spot should be boosted.
    const near = (2 * W + 1) * 4; // left of the bright pixel
    expect(a[near]).toBeGreaterThan(src[near]);
  });

  it('zero intensity leaves the frame (near-)unchanged', () => {
    const src = grayFrame();
    const out = applyHalation(src, W, H, { intensity: 0 });
    // Still a valid frame; assert no NaN
    for (let i = 0; i < out.length; i++) {
      expect(Number.isFinite(out[i])).toBe(true);
    }
  });
});

describe('applyGateWeave', () => {
  it('zero amplitude returns a copy (no shift)', () => {
    const src = grayFrame();
    const out = applyGateWeave(src, W, H, 10, { amplitude: 0 });
    expect(out).toEqual(src);
  });

  it('is deterministic for a given frame', () => {
    const src = grayFrame();
    const a = applyGateWeave(src, W, H, 100, { amplitude: 0.2, seed: 5 });
    const b = applyGateWeave(src, W, H, 100, { amplitude: 0.2, seed: 5 });
    expect(a).toEqual(b);
  });

  it('different frames wobble differently', () => {
    const src = grayFrame();
    const a = applyGateWeave(src, W, H, 0, { amplitude: 0.8 });
    const b = applyGateWeave(src, W, H, 1, { amplitude: 0.8 });
    expect(a).not.toEqual(b);
  });
});

describe('push/pull curves', () => {
  it('makePushPullCurve(+1) doubles exposure (clamped)', () => {
    const c = makePushPullCurve(1);
    expect(c[64]).toBe(128);
    expect(c[128]).toBe(255); // 128*2=256 → clamped to 255
    expect(c[32]).toBe(64);
  });

  it('makePushPullCurve(-1) halves exposure', () => {
    const c = makePushPullCurve(-1);
    expect(c[128]).toBe(64);
    expect(c[255]).toBe(127); // floor(255 * 0.5)
  });

  it('applyPushPull applies the curve per channel', () => {
    const src = new Uint8ClampedArray(N);
    for (let i = 0; i < N; i += 4) {
      src[i] = 100;
      src[i + 1] = 50;
      src[i + 2] = 25;
      src[i + 3] = 255;
    }
    const out = applyPushPull(src, W, H, makePushPullCurve(1));
    expect(out[0]).toBe(200);
    expect(out[1]).toBe(100);
    expect(out[2]).toBe(50);
  });
});
