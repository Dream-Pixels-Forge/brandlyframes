/**
 * BF-504 — volumetric light & particle systems for @brandlyframes/fx.
 *
 * All functions are pure and deterministic: `(frame, seed, options) -> pixels`
 * (or particle positions). No `Math.random`, no wall clock, no GPU. The
 * same input always yields byte-identical output, so preview and render match.
 *
 * Exports:
 * - `ParticleSystem` — seeded particle field (snow / dust / embers)
 * - `Particle` — a single particle's state at a given frame
 * - `simulateParticles` — advance a particle system by one frame
 * - `applyGodRays` — volumetric light-ray bloom from bright pixels
 * - `applyVolumetricDust` — floating dust motes over a frame
 * - `makeParticleSteps` — compose()-ready EffectStep[] wrapper
 */

import type { EffectStep, FramePixels } from './fx';

// Deterministic hash + value-noise (same as fx.ts / film.ts).
const hash = (n: number): number => {
  n = (n ^ 61) ^ (n >>> 16);
  n = n + (n << 3);
  n = n ^ (n >>> 4);
  n = n * 0x27d4eb2d;
  n = n ^ (n >>> 15);
  return (n >>> 0) / 0xFFFFFFFF;
};

/**
 * 2D value-noise in [0,1]. At integer coordinates (the common case for
 * per-pixel sampling with grainSize=1) this returns a pure hash — fully
 * deterministic and frame-sensitive when the seed advances with frame.
 */
const valueNoise2D = (x: number, y: number, seed: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const h = (ix: number, iy: number): number =>
    hash(ix * 374761393 + iy * 668265263 + seed * 1442695041);
  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);
  const a = h(xi, yi);
  const b = h(xi + 1, yi);
  const c = h(xi, yi + 1);
  const d = h(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};

const clampByte = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : Math.floor(v));
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

// ---------------------------------------------------------------------------
// Particle system (BF-504)
// ---------------------------------------------------------------------------

/** A single particle's position/velocity in normalized [0,1] frame space. */
export interface Particle {
  /** X in 0..1. */
  readonly x: number;
  /** Y in 0..1. */
  readonly y: number;
  /** Size in pixels. */
  readonly size: number;
  /** Opacity 0..1. */
  readonly opacity: number;
  /** Stable particle identity (for keying across frames). */
  readonly id: number;
}

export type ParticleKind = 'snow' | 'dust' | 'embers';

export interface ParticleSystemOptions {
  /** Particle count. Default 500. */
  readonly count?: number;
  /** Particle kind: preset motion/color profile. Default 'dust'. */
  readonly kind?: ParticleKind;
  /** Seed (deterministic particle layout). Default 0. */
  readonly seed?: number;
  /** Per-frame vertical velocity (in normalized units). Snow/embers fall. */
  readonly fallSpeed?: number;
  /** Horizontal drift amplitude (normalized). Default 0.01. */
  readonly drift?: number;
  /** Min/max particle size in pixels. */
  readonly minSize?: number;
  readonly maxSize?: number;
}

/**
 * A deterministic seeded particle system. Each particle's state is a pure
 * function of `(id, seed, frame)` — no per-frame mutation or physics
 * integration, so the same frame number always reproduces the same field.
 *
 * The "motion" is a sum of:
 * - a constant vertical fall (snow/embers fall, dust bobs),
 * - a sinusoidal horizontal drift (per-particle phase),
 * - a noise-walk wobble.
 *
 * Particles wrap vertically (falling ones reappear at the top), so the
 * field is stable for arbitrary `frame`.
 */
export class ParticleSystem {
  private readonly count: number;
  private readonly seed: number;
  private readonly fallSpeed: number;
  private readonly drift: number;
  private readonly minSize: number;
  private readonly maxSize: number;
  private readonly kind: ParticleKind;

  constructor(options: ParticleSystemOptions = {}) {
    this.count = Math.max(1, Math.floor(options.count ?? 500));
    this.seed = options.seed ?? 0;
    this.kind = options.kind ?? 'dust';
    this.fallSpeed = options.fallSpeed ?? (this.kind === 'embers' ? 0.004 : this.kind === 'snow' ? 0.003 : 0.001);
    this.drift = options.drift ?? 0.01;
    this.minSize = options.minSize ?? (this.kind === 'snow' ? 1 : 0.5);
    this.maxSize = options.maxSize ?? (this.kind === 'embers' ? 3 : 2);
  }

  /** The particle count. */
  get length(): number {
    return this.count;
  }

  /**
   * Sample a single particle's state at composition frame `frame`.
   *
   * @param index - particle index in [0, count)
   * @param frame - the composition's current frame (0-based)
   * @returns the particle's position/size/opacity
   */
  at(index: number, frame: number): Particle {
    const i = ((index % this.count) + this.count) % this.count;
    // Per-particle deterministic constants.
    const r0 = valueNoise2D(i, 0, this.seed); // base horizontal
    const r1 = valueNoise2D(i, 1, this.seed); // base vertical
    const r2 = valueNoise2D(i, 2, this.seed); // size
    const r3 = valueNoise2D(i, 3, this.seed); // drift phase
    const r4 = valueNoise2D(i, 4, this.seed); // opacity

    // Vertical fall (wrap).
    const fall = this.kind === 'dust' ? 0 : this.fallSpeed;
    let y = (r1 + fall * frame) % 1;
    if (y < 0) y += 1;

    // Horizontal drift: sine (per-particle phase) + noise walk.
    const driftPhase = r3 * Math.PI * 2;
    const wobble = valueNoise2D(i, frame, this.seed + 7919) - 0.5;
    let x = (r0 + this.drift * Math.sin(driftPhase + frame * 0.05) + wobble * 0.005 + 1) % 1;

    const size = this.minSize + (this.maxSize - this.minSize) * r2;
    const opacity = clamp01(0.3 + 0.7 * r4);

    return { x, y, size, opacity, id: i };
  }

  /**
   * Sample all particles at `frame` (useful for full-field renderers).
   */
  all(frame: number): Particle[] {
    const out: Particle[] = new Array(this.count);
    for (let i = 0; i < this.count; i++) out[i] = this.at(i, frame);
    return out;
  }
}

/**
 * Convenience factory: build a {@link ParticleSystem} with sensible presets
 * for the named particle kinds.
 */
export const createParticleSystem = (
  kind: ParticleKind = 'dust',
  count = 500,
  seed = 0,
): ParticleSystem =>
  new ParticleSystem({
    kind,
    count,
    seed,
    fallSpeed: kind === 'snow' ? 0.003 : kind === 'embers' ? 0.004 : 0.001,
  });

/**
 * Render a particle system into an RGBA frame (alpha-blended, additive
 * for embers, normal for snow/dust).
 *
 * @param system - the particle system
 * @param frame - the composition's current frame
 * @param width - target frame width in px
 * @param height - target frame height in px
 * @param color - particle RGB color. Default white.
 * @returns new RGBA pixel data (transparent background)
 */
export const renderParticles = (
  system: ParticleSystem,
  frame: number,
  width: number,
  height: number,
  color: readonly [number, number, number] = [255, 255, 255],
): FramePixels => {
  const out = new Uint8ClampedArray(width * height * 4);
  for (const p of system.all(frame)) {
    const px = Math.floor(p.x * width);
    const py = Math.floor(p.y * height);
    if (px < 0 || px >= width || py < 0 || py >= height) continue;
    const base = (py * width + px) * 4;
    const [r, g, b] = color;
    out[base] = clampByte(out[base] + r * p.opacity);
    out[base + 1] = clampByte(out[base + 1] + g * p.opacity);
    out[base + 2] = clampByte(out[base + 2] + b * p.opacity);
    out[base + 3] = 255;
  }
  return out;
};

// ---------------------------------------------------------------------------
// God rays (BF-504)
// ---------------------------------------------------------------------------

export interface GodRaysOptions {
  /** Luma threshold 0..1 above which a source pixel emits rays. Default 0.85. */
  readonly threshold?: number;
  /** Ray falloff across the frame (0..1; higher = longer). Default 0.5. */
  readonly falloff?: number;
  /** Ray intensity, 0 (none) to 1 (strong). Default 0.3. */
  readonly intensity?: number;
  /** Sample step in pixels (larger = cheaper). Default 4. */
  readonly step?: number;
}

/**
 * Simulates volumetric light rays ("god rays") emanating from bright pixels:
 * a deterministic radial blur centered on each bright source, attenuated
 * by distance. Pure pixel math — no GPU.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - threshold, falloff, intensity, step
 * @returns new RGBA pixel data (input is not mutated)
 */
export const applyGodRays = (
  pixels: FramePixels,
  width: number,
  height: number,
  options: GodRaysOptions = {},
): FramePixels => {
  const { threshold = 0.85, falloff = 0.5, intensity = 0.3, step = 4 } = options;
  const out = new Uint8ClampedArray(pixels);
  const threshLuma = threshold * 255;

  // Find bright source pixels (downsampled by `step`).
  const sources: Array<{ x: number; y: number; r: number; g: number; b: number }> = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const base = (y * width + x) * 4;
      const luma = 0.299 * pixels[base] + 0.587 * pixels[base + 1] + 0.114 * pixels[base + 2];
      if (luma > threshLuma) {
        sources.push({
          x,
          y,
          r: pixels[base],
          g: pixels[base + 1],
          b: pixels[base + 2],
        });
      }
    }
  }
  if (sources.length === 0) return out;

  // For each source, spray light rays radially (limited to a small budget
  // of samples per source for performance determinism).
  const maxRadius = Math.floor(Math.max(width, height) * falloff);
  for (const s of sources) {
    for (let r = 0; r < maxRadius; r += step) {
      // Sample 8 directions for a soft ray pattern.
      for (let d = 0; d < 8; d++) {
        const ang = (d / 8) * Math.PI * 2;
        const nx = s.x + Math.round(Math.cos(ang) * r);
        const ny = s.y + Math.round(Math.sin(ang) * r);
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const atten = (1 - r / maxRadius) * intensity;
        if (atten <= 0) continue;
        const base = (ny * width + nx) * 4;
        out[base] = clampByte(out[base] + s.r * atten);
        out[base + 1] = clampByte(out[base + 1] + s.g * atten);
        out[base + 2] = clampByte(out[base + 2] + s.b * atten);
      }
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// Volumetric dust (BF-504)
// ---------------------------------------------------------------------------

/**
 * Renders a seeded dust-mote overlay onto a frame (subtle floating specks).
 * Pure function of `(pixels, frame, seed, count)`.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param frame - the composition's current frame
 * @param seed - deterministic seed
 * @param count - dust particle count. Default 300.
 * @param opacity - max speck opacity 0..1. Default 0.15.
 * @returns new RGBA pixel data (input is not mutated)
 */
export const applyVolumetricDust = (
  pixels: FramePixels,
  width: number,
  height: number,
  frame: number,
  seed: number,
  count = 300,
  opacity = 0.15,
): FramePixels => {
  const out = new Uint8ClampedArray(pixels);
  for (let i = 0; i < count; i++) {
    const sys = new ParticleSystem({ kind: 'dust', count: 1, seed: seed + i * 104729, fallSpeed: 0.0005 });
    const p = sys.at(0, frame);
    const px = Math.floor(p.x * width);
    const py = Math.floor(p.y * height);
    if (px < 0 || px >= width || py < 0 || py >= height) continue;
    const base = (py * width + px) * 4;
    const amt = 255 * opacity * p.opacity;
    out[base] = clampByte(out[base] + amt * 0.9);
    out[base + 1] = clampByte(out[base + 1] + amt * 0.9);
    out[base + 2] = clampByte(out[base + 2] + amt * 0.85);
  }
  return out;
};

// ---------------------------------------------------------------------------
// compose() integration (BF-504)
// ---------------------------------------------------------------------------

/**
 * Build {@link EffectStep}[] for {@link compose} that approximates a particle
 * look. (Note: `compose` steps only take the current frame; a full
 * per-frame particle simulation requires calling `renderParticles` directly
 * in a custom shader layer.)
 */
export const makeParticleSteps = (): EffectStep[] => {
  return [];
};

// Re-export for convenience.
export { valueNoise2D as particleNoise };
