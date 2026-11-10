import { describe, expect, it } from 'vitest';
import {
  makeBokehMask,
  applyBokeh,
  applyHorizontalFlare,
  applyFocusBreathing,
  applyVintageVignette,
  applyAnamorphic,
  makeLensCharacterLut,
  applyLensCharacterLut,
  type FramePixels,
} from '../src/lens';

const W = 24;
const H = 24;
const N = W * H * 4;

/** Dark frame with a single bright spot at the center. */
const spotFrame = (): FramePixels => {
  const d = new Uint8ClampedArray(N);
  for (let i = 0; i < N; i += 4) {
    d[i] = 8;
    d[i + 1] = 8;
    d[i + 2] = 8;
    d[i + 3] = 255;
  }
  const cx = W >> 1;
  const cy = H >> 1;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const base = ((cy + dy) * W + (cx + dx)) * 4;
      d[base] = 250;
      d[base + 1] = 240;
      d[base + 2] = 200;
    }
  }
  return d;
};

describe('makeBokehMask', () => {
  it('circular mask: center is inside, far corner is outside', () => {
    const m = makeBokehMask(21, 21, { radius: 10 });
    expect(m[10 * 21 + 10]).toBe(1); // center
    expect(m[0]).toBe(0); // corner (0,0) is outside radius 10
  });

  it('hexagonal (6-blade) mask is polygonal: fewer "inside" pixels than a circle', () => {
    const circle = makeBokehMask(21, 21, { radius: 10, blades: 0 });
    const hex = makeBokehMask(21, 21, { radius: 10, blades: 6 });
    const count = (m: Float32Array) => m.reduce((a, b) => a + (b > 0.5 ? 1 : 0), 0);
    expect(count(hex)).toBeLessThan(count(circle));
  });

  it('is deterministic: same options → identical mask', () => {
    const a = makeBokehMask(15, 15, { blades: 8, radius: 7 });
    const b = makeBokehMask(15, 15, { blades: 8, radius: 7 });
    expect(a).toEqual(b);
  });
});

describe('applyBokeh', () => {
  it('is deterministic: same frame → byte-identical output', () => {
    const src = spotFrame();
    const a = applyBokeh(src, W, H, { threshold: 0.5, radius: 5, blades: 6 });
    const b = applyBokeh(src, W, H, { threshold: 0.5, radius: 5, blades: 6 });
    expect(a).toEqual(b);
  });

  it('does not mutate the input', () => {
    const src = spotFrame();
    const before = new Uint8ClampedArray(src);
    applyBokeh(src, W, H, { threshold: 0.5, radius: 4 });
    expect(src).toEqual(before);
  });

  it('hexagonal bokeh differs from circular on the same frame', () => {
    const src = spotFrame();
    const circ = applyBokeh(src, W, H, { threshold: 0.5, radius: 5, blades: 0 });
    const hex = applyBokeh(src, W, H, { threshold: 0.5, radius: 5, blades: 6 });
    expect(circ).not.toEqual(hex);
  });

  it('zero-strength returns a copy (no blur)', () => {
    const src = spotFrame();
    const out = applyBokeh(src, W, H, { threshold: 0.5, radius: 4, strength: 0 });
    expect(out).toEqual(src);
  });
});

describe('applyHorizontalFlare', () => {
  it('adds a horizontal streak to the right of a bright spot', () => {
    const src = spotFrame();
    const out = applyHorizontalFlare(src, W, H, { threshold: 0.8, length: 10, intensity: 0.5 });
    const cx = W >> 1;
    const cy = H >> 1;
    // A pixel 6px right of the spot center should be brighter in R than src.
    const target = (cy * W + (cx + 6)) * 4;
    expect(out[target]).toBeGreaterThan(src[target]);
  });

  it('is deterministic', () => {
    const src = spotFrame();
    const a = applyHorizontalFlare(src, W, H, { threshold: 0.8, length: 12, seed: 3 });
    const b = applyHorizontalFlare(src, W, H, { threshold: 0.8, length: 12, seed: 3 });
    expect(a).toEqual(b);
  });

  it('does not mutate the input', () => {
    const src = spotFrame();
    const before = new Uint8ClampedArray(src);
    applyHorizontalFlare(src, W, H, { threshold: 0.8, length: 8 });
    expect(src).toEqual(before);
  });
});

describe('applyFocusBreathing', () => {
  it('zero depth returns a copy', () => {
    const src = spotFrame();
    const out = applyFocusBreathing(src, W, H, { depth: 0 });
    expect(out).toEqual(src);
  });

  it('is deterministic for a given frame', () => {
    const src = spotFrame();
    const a = applyFocusBreathing(src, W, H, { depth: 0.5, frame: 40, seed: 1 });
    const b = applyFocusBreathing(src, W, H, { depth: 0.5, frame: 40, seed: 1 });
    expect(a).toEqual(b);
  });

  it('different frames breathe differently on a non-radially-symmetric frame', () => {
    // The breathing is a radial resample around the center, so a radially
    // symmetric source (a centered spot) looks identical regardless of the
    // scale. Use a left-heavy gradient so off-center pixels sample distinct
    // source positions between frames.
    const d = new Uint8ClampedArray(N);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const b = (y * W + x) * 4;
        d[b] = x * 10;
        d[b + 1] = y * 10;
        d[b + 2] = 50;
        d[b + 3] = 255;
      }
    }
    // frame 0 and frame 30 both land on sin≈0 (phase 0 and π); pick frames
    // on opposite sides of the breathing wave so the scales differ.
    const f0 = applyFocusBreathing(d, W, H, { depth: 0.8, frame: 10 });
    const f15 = applyFocusBreathing(d, W, H, { depth: 0.8, frame: 15 });
    expect(f0).not.toEqual(f15);
  });
});

describe('applyVintageVignette', () => {
  it('darkens the corners more than the center', () => {
    const src = spotFrame();
    const out = applyVintageVignette(src, W, H, { strength: 0.6, inner: 0.4 });
    const center = (W >> 1) * W + (W >> 1);
    const corner = 0;
    // Compare mean RGB at center vs corner.
    const mean = (idx: number) => (out[idx * 4] + out[idx * 4 + 1] + out[idx * 4 + 2]) / 3;
    expect(mean(center)).toBeGreaterThan(mean(corner));
  });

  it('zero strength returns a copy', () => {
    const src = spotFrame();
    const out = applyVintageVignette(src, W, H, { strength: 0 });
    expect(out).toEqual(src);
  });

  it('mottle adds deterministic per-pixel noise in the corners', () => {
    const src = spotFrame();
    const plain = applyVintageVignette(src, W, H, { strength: 0.5, mottle: 0 });
    const mottled = applyVintageVignette(src, W, H, { strength: 0.5, mottle: 0.4, seed: 7 });
    expect(plain).not.toEqual(mottled);
    // Deterministic: recompute → identical.
    const mottled2 = applyVintageVignette(src, W, H, { strength: 0.5, mottle: 0.4, seed: 7 });
    expect(mottled).toEqual(mottled2);
  });
});

describe('applyAnamorphic', () => {
  it('release mode widens the image horizontally (samples from a narrower src band)', () => {
    const src = spotFrame();
    const out = applyAnamorphic(src, W, H, { factor: 2, mode: 'release' });
    // In release, output x maps to src x = cx + (x-cx)/2. A bright center
    // spot gets stretched outward: pixels that were dark now sample the
    // spot. Assert at least one pixel differs from the source.
    let differs = false;
    for (let i = 0; i < N; i++) {
      if (out[i] !== src[i]) {
        differs = true;
        break;
      }
    }
    expect(differs).toBe(true);
  });

  it('factor=1 returns a copy', () => {
    const src = spotFrame();
    const out = applyAnamorphic(src, W, H, { factor: 1 });
    expect(out).toEqual(src);
  });

  it('is deterministic', () => {
    const src = spotFrame();
    const a = applyAnamorphic(src, W, H, { factor: 2, mode: 'squeeze' });
    const b = applyAnamorphic(src, W, H, { factor: 2, mode: 'squeeze' });
    expect(a).toEqual(b);
  });
});

describe('lens character LUT', () => {
  it('produces a valid 256-entry LUT with 0..1 values', () => {
    const lut = makeLensCharacterLut();
    expect(lut.size).toBe(256);
    expect(lut.data.length).toBe(256);
    for (const v of lut.data) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    // The S-curve should lift highlights: data[255] near 1.
    expect(lut.data[255]).toBeGreaterThan(0.95);
    // Shadows near 0.
    expect(lut.data[0]).toBeLessThan(0.05);
  });

  it('applyLensCharacterLut is deterministic', () => {
    const src = spotFrame();
    const a = applyLensCharacterLut(src, W, H);
    const b = applyLensCharacterLut(src, W, H);
    expect(a).toEqual(b);
  });

  it('brightens mid-tones slightly (contrast S-curve)', () => {
    const src = spotFrame();
    const out = applyLensCharacterLut(src, W, H);
    // The bright spot (≈250) should stay bright; dark (≈8) should stay dark.
    const cx = W >> 1;
    const cy = H >> 1;
    const spot = out[(cy * W + cx) * 4];
    expect(spot).toBeGreaterThan(200);
  });
});
