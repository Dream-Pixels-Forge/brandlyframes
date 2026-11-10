/**
 * BF-501 — film stock & chemical process emulation for @brandlyframes/fx.
 *
 * All functions are pure and deterministic: `frame -> pixels` with no wall
 * clock, no `Math.random`, and no GPU. The same `(frame, seed, options)`
 * input always produces byte-identical output, so preview and render match.
 *
 * Effects:
 * - `applyFilmStock` — stock-specific grain + push/pull tonal curves
 *   (`kodak-5219`, `fuji-400`, `ilford-hp5`, or any {@link FilmStockSpec})
 * - `applyHalation` — warm red edge-blooms around bright transitions
 * - `applyGateWeave` — subtle periodic micro-oscillation (projector wobble)
 * - `makePushPullCurve` / `applyPushPull` — exposure push/pull grade curves
 * - `makeFilmStockSteps` — compose()-ready EffectStep[] for a stock preset
 */

import {
  applyBloom,
  applyFilmGrain,
  type EffectStep,
  type FramePixels,
} from './fx';

// ---------------------------------------------------------------------------
// Shared deterministic hashing (kept local so this module stays self-contained)
// ---------------------------------------------------------------------------

const hash = (n: number): number => {
  n = (n ^ 61) ^ (n >>> 16);
  n = n + (n << 3);
  n = n ^ (n >>> 4);
  n = n * 0x27d4eb2d;
  n = n ^ (n >>> 15);
  return (n >>> 0) / 0xFFFFFFFF;
};

/** 2D value-noise in [0,1] from a lattice of hashed grid cells (deterministic). */
const valueNoise2D = (x: number, y: number, seed: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const h = (ix: number, iy: number): number => hash(ix * 374761393 + iy * 668265263 + seed * 1442695041);
  const sx = xf * xf * (3 - 2 * xf);
  const sy = yf * yf * (3 - 2 * yf);
  const a = h(xi, yi);
  const b = h(xi + 1, yi);
  const c = h(xi, yi + 1);
  const d = h(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
};

const clampByte = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : Math.floor(v));
const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

// ---------------------------------------------------------------------------
// Film stock specs (BF-501)
// ---------------------------------------------------------------------------

/** A film stock preset: named tonal/character parameters. */
export interface FilmStockSpec {
  readonly name: string;
  /** Film ISO (drives grain density). */
  readonly iso: number;
  /** Per-channel color shift in -128..128 (negative bias for the channel). */
  readonly shift: readonly [number, number, number];
  /** Grain intensity multiplier relative to ISO. */
  readonly grainScale: number;
  /** Base grain size in px (higher = coarser). */
  readonly grainSize: number;
  /** Push/pull stops baked into the default curve (0.5 = neutral). */
  readonly exposure: number;
  /** Contrast multiplier for the S-curve. */
  readonly contrast: number;
  /** Shadow tone lift 0..1 (0 = hard shadows). */
  readonly shadowLift: number;
  /** Highlight rolloff 0..1 (0 = hard highlights). */
  readonly highlightRoll: number;
}

/** Built-in film stocks. Values are hand-tuned character approximations. */
export const FILM_STOCKS: Record<string, FilmStockSpec> = {
  'kodak-5219': {
    name: 'Kodak 5219',
    iso: 500,
    shift: [-4, 8, 14], // cool shadows, warm midtones
    grainScale: 1.1,
    grainSize: 1,
    exposure: 0.5,
    contrast: 1.15,
    shadowLift: 0.04,
    highlightRoll: 0.2,
  },
  'fuji-400': {
    name: 'Fuji 400',
    iso: 400,
    shift: [8, -2, -10], // green-leaning mids, clean reds
    grainScale: 0.8,
    grainSize: 1,
    exposure: 0.5,
    contrast: 0.95,
    shadowLift: 0.02,
    highlightRoll: 0.3,
  },
  'ilford-hp5': {
    name: 'Ilford HP5 (B&W)',
    iso: 400,
    shift: [0, 0, 0],
    grainScale: 1.4,
    grainSize: 1.5,
    exposure: 0.5,
    contrast: 1.25,
    shadowLift: 0.06,
    highlightRoll: 0.15,
  },
};

export type FilmStockName = keyof typeof FILM_STOCKS | 'custom';

/** Options for {@link applyFilmStock}. */
export interface FilmStockOptions {
  /** Stock preset name, or a full spec. */
  readonly stock?: string | FilmStockSpec;
  /** Frame number (drives deterministic grain phase). Default 0. */
  readonly frame?: number;
  /** Additional seed mixed into the grain. Default 0. */
  readonly seed?: number;
  /** Bilevel/desaturated look: true forces monochrome grain (B&W stocks). */
  readonly monochrome?: boolean;
  /** Grain intensity multiplier (1 = stock default). Default 1. */
  readonly grainIntensity?: number;
}

/** Resolve a stock name/spec to a FilmStockSpec. */
export const resolveFilmStock = (stock?: string | FilmStockSpec): FilmStockSpec => {
  if (stock && typeof stock === 'object') return stock;
  const name = (stock ?? 'kodak-5219') as string;
  const spec = FILM_STOCKS[name];
  if (!spec) {
    throw new Error(`applyFilmStock: unknown film stock "${name}" (known: ${Object.keys(FILM_STOCKS).join(', ')})`);
  }
  return spec;
};

/**
 * Per-pixel tonal curve for a film stock (push/pull + S-contrast + shadow lift
 * + highlight rolloff). Pure function of input value 0..255.
 */
export const filmStockToneCurve = (spec: FilmStockSpec): ((v: number) => number)[] => {
  // Per-channel exposure: push > 0 brightens, pull < 0 darkens (in stops, 1 stop = 2x).
  const factor = Math.pow(2, (spec.exposure - 0.5) * 2);
  const shadow = spec.shadowLift;
  const roll = spec.highlightRoll;
  const makeCurve = (channel: 0 | 1 | 2) => {
    const shift = spec.shift[channel] / 255;
    return (v: number): number => {
      let t = v / 255;
      // Exposure push/pull.
      t = clamp(t * factor, 0, 1);
      // S-contrast around 0.5.
      t = 0.5 + (t - 0.5) * spec.contrast;
      // Shadow lift.
      t = shadow + t * (1 - shadow);
      // Highlight rolloff (soft clip near 1).
      if (t > 1 - roll && roll > 0) {
        const s = (t - (1 - roll)) / roll;
        t = 1 - roll + roll * Math.sin((s * Math.PI) / 2);
      }
      t = clamp(t + shift, 0, 1);
      return t * 255;
    };
  };
  return [makeCurve(0), makeCurve(1), makeCurve(2)];
};

/** ISO-scaled grain intensity. */
const stockGrainIntensity = (spec: FilmStockSpec, mult: number): number => {
  const isoGrain = Math.sqrt(spec.iso / 100) * 0.04;
  return clamp((isoGrain * spec.grainScale * mult) * spec.grainSize, 0, 1);
};

/**
 * Apply a named film stock look to a frame: tonal curves, per-frame
 * deterministic grain, stock color shift, and an optional subtle blooming
 * halation on high contrast stocks.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - stock preset name or spec, frame, seed, grain intensity
 * @returns new RGBA pixel data (input is not mutated)
 */
export const applyFilmStock = (
  pixels: FramePixels,
  width: number,
  height: number,
  options: FilmStockOptions = {},
): FramePixels => {
  const spec = resolveFilmStock(options.stock);
  const frame = Math.max(0, Math.floor(options.frame ?? 0));
  const seed = options.seed ?? 0;
  const grainMult = options.grainIntensity ?? 1;
  const curves = filmStockToneCurve(spec);

  const out = new Uint8ClampedArray(pixels.length);

  // 1) Tonal curves.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const base = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        out[base + c] = clampByte(curves[c](pixels[base + c]));
      }
      out[base + 3] = pixels[base + 3];
    }
  }

  // 2) Per-pixel, per-frame deterministic grain. The frame phase is hashed
  // into the seed so the grain pattern is stable within a frame but advances
  // between frames (the film "rolls").
  const grainI = stockGrainIntensity(spec, grainMult);
  const scale = 1 / Math.max(spec.grainSize, 0.5);
  const framePhase = frame * 31 + seed;
  const mono = options.monochrome === true || spec.shift.every((v) => v === 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const base = (y * width + x) * 4;
      if (mono) {
        const noise = valueNoise2D(x * scale, y * scale, framePhase);
        const delta = (noise - 0.5) * 2 * 255 * grainI;
        for (let c = 0; c < 3; c++) out[base + c] = clampByte(out[base + c] + delta);
      } else {
        for (let c = 0; c < 3; c++) {
          const noise = valueNoise2D(x * scale, y * scale, framePhase + c * 7919);
          out[base + c] = clampByte(out[base + c] + (noise - 0.5) * 2 * 255 * grainI * 0.6);
        }
      }
    }
  }

  // 3) Halation on high-contrast stocks (subtle, deterministic).
  if (spec.contrast > 1.05) {
    applyHalation(out, width, height, { intensity: 0.12, seed: framePhase, frame: 0 });
  }

  return out;
};

// ---------------------------------------------------------------------------
// applyHalation (BF-501)
// ---------------------------------------------------------------------------

export interface HalationOptions {
  /** Edge-bloom strength, 0 (none) to 0.5 (strong). Default 0.15. */
  readonly intensity?: number;
  /** Luma threshold 0..1 above which halation fires. Default 0.75. */
  readonly threshold?: number;
  /** Seed for the warm color jitter. Default 0. */
  readonly seed?: number;
  /** Frame number for deterministic per-frame variation. Default 0. */
  readonly frame?: number;
}

/**
 * Adds warm red "halation" around bright edges — the soft red fringe that
 * classic film emulsions show at high-contrast transitions.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - intensity, threshold, seed, frame
 * @returns new RGBA pixel data (input is not mutated)
 */
export const applyHalation = (
  pixels: FramePixels,
  width: number,
  height: number,
  options: HalationOptions = {},
): FramePixels => {
  const { intensity = 0.15, threshold = 0.75, seed = 0, frame = 0 } = options;
  const out = new Uint8ClampedArray(pixels);
  const threshLuma = threshold * 255;

  // Collect high-luma edge pixels into a warm buffer.
  const warm = new Float32Array(pixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const base = (y * width + x) * 4;
      const luma =
        0.299 * pixels[base] + 0.587 * pixels[base + 1] + 0.114 * pixels[base + 2];
      if (luma > threshLuma) {
        const amt = ((luma - threshLuma) / (255 - threshLuma)) * intensity;
        // Warm halation color: reds 0.9, greens 0.45, blues 0.2 (classic film).
        warm[base] = 255 * amt * 0.9;
        warm[base + 1] = 255 * amt * 0.45;
        warm[base + 2] = 255 * amt * 0.2;
      }
    }
  }

  // Blur + add back with a deterministic per-frame jitter to avoid banding.
  const r = 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const base = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let count = 0;
        for (let dy = -r; dy <= r; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= height) continue;
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= width) continue;
            sum += warm[(yy * width + xx) * 4 + c];
            count++;
          }
        }
        const jitter =
          (valueNoise2D(x * 0.5, y * 0.5, seed + frame * 104729 + c) - 0.5) * 6 * intensity;
        out[base + c] = clampByte(out[base + c] + sum / Math.max(count, 1) + jitter);
      }
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// applyGateWeave (BF-501)
// ---------------------------------------------------------------------------

export interface GateWeaveOptions {
  /** Weave amplitude in pixels. Default 0.08. */
  readonly amplitude?: number;
  /** Weave frequency in cycles per frame. Default 0.05. */
  readonly frequency?: number;
  /** Seed for phase. Default 0. */
  readonly seed?: number;
}

/**
 * Simulates projector gate weave — a subtle periodic micro-oscillation of the
 * frame. Implemented as a deterministic 1-pixel sub-pixel sine shift of the
 * whole image (the standard trick: we offset each row by a sine of its y,
 * wrapped by the frame number), which reads as "wobble" without any wall clock.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param frame - current frame number (drives the phase)
 * @param options - amplitude, frequency, seed
 * @returns new RGBA pixel data (input is not mutated)
 */
export const applyGateWeave = (
  pixels: FramePixels,
  width: number,
  height: number,
  frame: number,
  options: GateWeaveOptions = {},
): FramePixels => {
  const { amplitude = 0.5, frequency = 0.1, seed = 0 } = options;
  if (amplitude <= 0) return new Uint8ClampedArray(pixels);
  const out = new Uint8ClampedArray(pixels);
  const phase = (frame * frequency + seed * 0.37) * Math.PI * 2;
  const amp = amplitude; // px
  for (let y = 0; y < height; y++) {
    const shift = Math.round(amp * Math.sin(phase + y * 0.3));
    for (let x = 0; x < width; x++) {
      const sx = x - shift;
      if (sx < 0 || sx >= width) continue; // wrap-free; edges stay (projector mask)
      const base = (y * width + x) * 4;
      const src = (y * width + sx) * 4;
      for (let c = 0; c < 4; c++) out[base + c] = pixels[src + c];
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// Push / pull curves (BF-501)
// ---------------------------------------------------------------------------

/**
 * Build a 256-entry push/pull tonal curve. `stops` > 0 pushes (brighter),
 * `stops` < 0 pulls (darker). 1 stop = factor of 2 in exposure.
 */
export const makePushPullCurve = (stops: number): Uint8ClampedArray => {
  const curve = new Uint8ClampedArray(256);
  const factor = Math.pow(2, stops);
  for (let v = 0; v < 256; v++) {
    curve[v] = clampByte(v * factor);
  }
  return curve;
};

/** Apply a 256-entry curve to each R/G/B channel of a frame. */
export const applyPushPull = (
  pixels: FramePixels,
  width: number,
  height: number,
  curve: Uint8ClampedArray,
): FramePixels => {
  const out = new Uint8ClampedArray(pixels);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = curve[pixels[i]];
    out[i + 1] = curve[pixels[i + 1]];
    out[i + 2] = curve[pixels[i + 2]];
  }
  return out;
};

// ---------------------------------------------------------------------------
// compose() integration (BF-501)
// ---------------------------------------------------------------------------

/**
 * Build a {@link EffectStep}[] for {@link compose} that applies a full
 * film-stock look: grain + halation + gate weave. This is the "drop-in"
 * for users who want the stock look through the existing shader-layer API.
 *
 * NOTE: `applyFilmGrain`/`applyBloom` in fx.ts are the building blocks;
 * these extra functions live in this module, so users compose them by
 * importing from 'fx/film' and wrapping, or use `applyFilmStock` directly.
 */
export const makeFilmStockSteps = (
  stock: string | FilmStockSpec,
  _frame: number,
  _seed: number,
): EffectStep[] => {
  const spec = resolveFilmStock(stock);
  return [
    {
      name: 'filmGrain',
      options: {
        intensity: stockGrainIntensity(spec, 1),
        monochrome: spec.shift.every((v) => v === 0),
      },
    },
    {
      name: 'bloom',
      options: {
        threshold: 0.7,
        intensity: 0.08,
        radius: 2,
      },
    },
  ];
};

// Re-export the underlying effect names so film.tsx consumers can import one thing.
export { applyFilmGrain, applyBloom };

export type { FramePixels };
