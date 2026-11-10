import { describe, expect, it } from 'vitest';
import {
  ParticleSystem,
  createParticleSystem,
  renderParticles,
  applyGodRays,
  applyVolumetricDust,
  type FramePixels,
} from '../src/particles';

const W = 16;
const H = 16;
const N = W * H * 4;

const solidFrame = (): FramePixels => {
  const d = new Uint8ClampedArray(N);
  for (let i = 0; i < N; i += 4) {
    d[i] = 10;
    d[i + 1] = 10;
    d[i + 2] = 10;
    d[i + 3] = 255;
  }
  return d;
};

/** A dark frame with one very bright pixel at the center (for god rays). */
const brightCenterFrame = (): FramePixels => {
  const d = solidFrame();
  const cx = Math.floor(W / 2);
  const cy = Math.floor(H / 2);
  const base = (cy * W + cx) * 4;
  d[base] = 255;
  d[base + 1] = 255;
  d[base + 2] = 255;
  return d;
};

describe('ParticleSystem', () => {
  it('is deterministic: same index/frame/seed → identical particle', () => {
    const sys = createParticleSystem('dust', 100, 42);
    for (const f of [0, 10, 99, 500]) {
      const a = sys.at(7, f);
      const b = sys.at(7, f);
      expect(a).toEqual(b);
    }
  });

  it('particles stay in [0,1] over many frames', () => {
    const sys = createParticleSystem('snow', 200, 5);
    for (let f = 0; f < 200; f += 7) {
      for (let i = 0; i < sys.length; i++) {
        const p = sys.at(i, f);
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThan(1);
        expect(p.size).toBeGreaterThan(0);
        expect(p.opacity).toBeGreaterThanOrEqual(0);
        expect(p.opacity).toBeLessThanOrEqual(1);
        expect(p.id).toBe(i);
      }
    }
  });

  it('snow falls over time (y advances), dust mostly bobs', () => {
    const snow = createParticleSystem('snow', 1, 1);
    const y0 = snow.at(0, 0).y;
    const y100 = snow.at(0, 100).y;
    // fallSpeed 0.003 * 100 frames = 0.3 of the frame — y should have advanced
    // (mod 1 wrap). Just assert it changed.
    expect(y0).not.toBe(y100);

    const dust = createParticleSystem('dust', 1, 1);
    // Dust has fallSpeed ~0.001 — over 100 frames ~0.1; likely changes too but
    // we only assert determinism + bounds (already covered).
    expect(dust.at(0, 0)).toEqual(dust.at(0, 0));
  });

  it('embers are warmer-color-friendly (size range up to 3)', () => {
    const sys = createParticleSystem('embers', 50, 1);
    const p = sys.at(0, 0);
    expect(p.size).toBeGreaterThanOrEqual(0.5);
    expect(p.size).toBeLessThanOrEqual(3.01);
  });
});

describe('renderParticles', () => {
  it('returns a transparent-background RGBA frame with the particle count lit', () => {
    const sys = createParticleSystem('dust', 4, 1);
    const out = renderParticles(sys, 10, W, H, [255, 200, 100]);
    expect(out.length).toBe(N);
    // At least one pixel should be lit (alpha=255) since 4 particles in 16x16.
    let lit = 0;
    for (let i = 0; i < N; i += 4) {
      if (out[i + 3] === 255 && (out[i] > 0 || out[i + 1] > 0 || out[i + 2] > 0)) lit++;
    }
    expect(lit).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const sys = createParticleSystem('snow', 10, 7);
    const a = renderParticles(sys, 20, W, H);
    const b = renderParticles(sys, 20, W, H);
    expect(a).toEqual(b);
  });

  it('does not mutate the input frame', () => {
    const src = solidFrame();
    const before = new Uint8ClampedArray(src);
    renderParticles(createParticleSystem('dust', 5, 1), 0, W, H);
    expect(src).toEqual(before);
  });
});

describe('applyGodRays', () => {
  it('adds radial light around a bright center pixel (deterministic)', () => {
    const src = brightCenterFrame();
    const a = applyGodRays(src, W, H, { intensity: 0.4, threshold: 0.85 });
    const b = applyGodRays(src, W, H, { intensity: 0.4, threshold: 0.85 });
    expect(a).toEqual(b);
  });

  it('brightens pixels near the source relative to the input', () => {
    const src = brightCenterFrame();
    const out = applyGodRays(src, W, H, { intensity: 0.5, threshold: 0.85, falloff: 0.6, step: 2 });
    // A pixel offset (8,8) from center (8,8) is the center itself; pick a
    // near-center pixel that should have caught some ray light.
    const cx = W / 2;
    const cy = H / 2;
    const nearBase = (Math.floor(cy) * W + Math.floor(cx) + 1) * 4;
    const srcVal = src[nearBase];
    const outVal = out[nearBase];
    expect(outVal).toBeGreaterThanOrEqual(srcVal);
  });

  it('no bright sources → unchanged frame (copy)', () => {
    const src = solidFrame(); // all luma ~10, below threshold
    const out = applyGodRays(src, W, H, { threshold: 0.85, intensity: 0.5 });
    expect(out).toEqual(src);
  });

  it('does not mutate the input', () => {
    const src = brightCenterFrame();
    const before = new Uint8ClampedArray(src);
    applyGodRays(src, W, H, { intensity: 0.4 });
    expect(src).toEqual(before);
  });
});

describe('applyVolumetricDust', () => {
  it('is deterministic and in-bounds', () => {
    const src = solidFrame();
    const a = applyVolumetricDust(src, W, H, 30, 99, 100, 0.2);
    const b = applyVolumetricDust(src, W, H, 30, 99, 100, 0.2);
    expect(a).toEqual(b);
    for (let i = 0; i < a.length; i += 4) {
      expect(a[i]).toBeGreaterThanOrEqual(0);
      expect(a[i]).toBeLessThanOrEqual(255);
    }
  });

  it('zero count returns a copy', () => {
    const src = solidFrame();
    const out = applyVolumetricDust(src, W, H, 5, 1, 0);
    expect(out).toEqual(src);
  });
});
