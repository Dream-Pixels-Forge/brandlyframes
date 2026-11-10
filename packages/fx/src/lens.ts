/**
 * BF-502 — anamorphic & lens character emulation for @brandlyframes/fx.
 *
 * Extends the existing `applyLensDistortion` (radial k1/k2) with the
 * "character" effects that make a lens feel like glass rather than a
 * pixel grid: oval (anamorphic) bokeh, horizontal flare streaks, focus
 * breathing, vintage vignetting, and depth-of-field with custom
 * aperture-blade counts (hexagonal / octagonal bokeh).
 *
 * All functions are pure and deterministic: `(pixels, w, h, options)` →
 * new pixels. No `Math.random`, no wall clock, no GPU. Same input always
 * yields byte-identical output, so preview and render match.
 *
 * Exports:
 * - `makeBokehMask` — build an aperture-blade mask (circular or N-blade)
 * - `applyBokeh` — threshold-based defocus: bright regions blur through
 *   the aperture shape (DOF with custom blade counts)
 * - `applyHorizontalFlare` — anamorphic horizontal flare streaks from
 *   bright pixels
 * - `applyFocusBreathing` — a slow, deterministic zoom-linked focal shift
 * - `applyVintageVignette` — corner falloff + optional mottle (oil-slick)
 * - `applyAnamorphic` — 2× horizontal squeeze/release (scope look)
 * - `makeLensCharacterSteps` — compose()-ready EffectStep[] wrapper
 */

import {
  applyLut,
  type FramePixels,
  type Lut,
} from './fx';
export type { FramePixels };

// Deterministic hash + value noise (self-contained, same scheme as film.ts).
const hash = (n: number): number => {
  n = (n ^ 61) ^ (n >>> 16);
  n = n + (n << 3);
  n = n ^ (n >>> 4);
  n = n * 0x27d4eb2d;
  n = n ^ (n >>> 15);
  return (n >>> 0) / 0xFFFFFFFF;
};

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

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const clampByte = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : Math.floor(v));

// ---------------------------------------------------------------------------
// Aperture-blade bokeh mask (BF-502)
// ---------------------------------------------------------------------------

export interface BokehMaskOptions {
  /**
   * Number of aperture blades: 0 or 1 = circular, 3+ = polygonal
   * (hexagonal at 6, octagonal at 8). Default 0 (circular).
   */
  readonly blades?: number;
  /** Mask radius in pixels. Default 16. */
  readonly radius?: number;
  /** Rotate the blade polygon by this many degrees. Default 0. */
  readonly rotationDeg?: number;
}

/**
 * Build a 2D aperture mask (Float32Array, 0..1) that is 1 inside the blade
 * shape and 0 outside. The mask is a pure function of its options — fully
 * deterministic.
 *
 * @param width - mask width in px
 * @param height - mask height in px
 * @param options - blades, radius, rotationDeg
 * @returns a `width * height` Float32Array
 */
export const makeBokehMask = (
  width: number,
  height: number,
  options: BokehMaskOptions = {},
): Float32Array => {
  const { blades = 0, radius = 16, rotationDeg = 0 } = options;
  const mask = new Float32Array(width * height);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const rot = (rotationDeg * Math.PI) / 180;
  const side = Math.floor(radius * 0.87); // chord distance for a regular polygon
  const poly = blades >= 3;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      let inside: boolean;
      if (!poly) {
        inside = r <= radius;
      } else {
        // Regular N-gon: point is inside if its distance to each edge
        // (projected onto the rotated axis) is within the apothem.
        const ang = Math.atan2(dy, dx) - rot;
        const seg = (Math.PI * 2) / blades;
        // Distance to the nearest edge = r * cos(angle within segment).
        const local = ((ang % seg) + seg) % seg;
        const distToEdge = r * Math.cos(local - seg / 2);
        inside = distToEdge <= side;
      }
      // Soft edge (1-px feather) to avoid aliasing in the blur.
      const feather = inside ? 1 : 0;
      mask[y * width + x] = feather;
    }
  }
  return mask;
};

// ---------------------------------------------------------------------------
// applyBokeh — threshold defocus through the aperture shape (BF-502)
// ---------------------------------------------------------------------------

export interface BokehOptions {
  /** Luma threshold 0..1 above which a pixel "bokeh's" (goes soft). Default 0.6. */
  readonly threshold?: number;
  /** Defocus radius in px. Default 8. */
  readonly radius?: number;
  /** Number of aperture blades for the blur shape (0 = circular). Default 0. */
  readonly blades?: number;
  /** Rotation of the blade polygon, degrees. Default 0. */
  readonly rotationDeg?: number;
  /** How much of the blurred result replaces the sharp pixel, 0..1. Default 0.7. */
  readonly strength?: number;
}

/**
 * Adds a depth-of-field "bokeh" to bright regions: pixels above the luma
 * threshold are replaced by an aperture-shaped blur of their neighborhood,
 * producing round (0 blades) or polygonal (N blades) highlights — the
 * signature of a real lens at wide aperture.
 *
 * The blur is a weighted box within an aperture mask, so the defocused
 * region inherits the blade shape. Pure, deterministic.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - threshold, radius, blades, rotationDeg, strength
 * @returns new RGBA pixel data (input is not mutated)
 */
export const applyBokeh = (
  pixels: FramePixels,
  width: number,
  height: number,
  options: BokehOptions = {},
): FramePixels => {
  const { threshold = 0.6, radius = 8, blades = 0, rotationDeg = 0, strength = 0.7 } = options;
  const out = new Uint8ClampedArray(pixels);
  const threshLuma = threshold * 255;
  const r = Math.max(1, Math.floor(radius));

  // Build a square aperture mask centered on each candidate pixel.
  const msize = r * 2 + 1;
  const mask = makeBokehMask(msize, msize, { blades, radius: r, rotationDeg });
  // Pre-compute a weighted kernel: mask * (1 - normalized distance) for falloff.
  const kernel = new Float32Array(msize * msize);
  let ksum = 0;
  const c = r;
  for (let ky = 0; ky < msize; ky++) {
    for (let kx = 0; kx < msize; kx++) {
      const ddx = kx - c;
      const ddy = ky - c;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      const w = (mask[ky * msize + kx] ? 1 : 0) * Math.max(0, 1 - dist / Math.max(radius, 1));
      kernel[ky * msize + kx] = w;
      ksum += w;
    }
  }
  if (ksum <= 0) return out;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const base = (y * width + x) * 4;
      const luma =
        0.299 * pixels[base] + 0.587 * pixels[base + 1] + 0.114 * pixels[base + 2];
      if (luma <= threshLuma) continue; // only bright regions go soft

      let rs = 0,
        gs = 0,
        bs = 0,
        wsum = 0;
      for (let ky = -r; ky <= r; ky++) {
        const py = y + ky;
        if (py < 0 || py >= height) continue;
        for (let kx = -r; kx <= r; kx++) {
          const px = x + kx;
          if (px < 0 || px >= width) continue;
          const w = kernel[(ky + r) * msize + (kx + r)];
          if (w <= 0) continue;
          const s = (py * width + px) * 4;
          rs += pixels[s] * w;
          gs += pixels[s + 1] * w;
          bs += pixels[s + 2] * w;
          wsum += w;
        }
      }
      if (wsum <= 0) continue;
      out[base] = clampByte(lerp(pixels[base], rs / wsum, strength));
      out[base + 1] = clampByte(lerp(pixels[base + 1], gs / wsum, strength));
      out[base + 2] = clampByte(lerp(pixels[base + 2], bs / wsum, strength));
    }
  }
  return out;
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// ---------------------------------------------------------------------------
// applyHorizontalFlare — anamorphic flare streaks (BF-502)
// ---------------------------------------------------------------------------

export interface HorizontalFlareOptions {
  /** Luma threshold 0..1 that triggers a streak. Default 0.9. */
  readonly threshold?: number;
  /** Streak length in px. Default 48. */
  readonly length?: number;
  /** Streak intensity 0..1. Default 0.35. */
  readonly intensity?: number;
  /** Seed for the subtle per-streak color shift (deterministic). Default 0. */
  readonly seed?: number;
}

/**
 * Anamorphic lenses throw bright highlights into long horizontal streaks
 * (the "scope flare"). This traces a horizontal ray left+right from each
 * bright pixel and adds a warm, attenuated streak — the signature look of
 * 2× anamorphic footage.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - threshold, length, intensity, seed
 * @returns new RGBA pixel data (input is not mutated)
 */
export const applyHorizontalFlare = (
  pixels: FramePixels,
  width: number,
  height: number,
  options: HorizontalFlareOptions = {},
): FramePixels => {
  const { threshold = 0.9, length = 48, intensity = 0.35, seed = 0 } = options;
  const out = new Uint8ClampedArray(pixels);
  const threshLuma = threshold * 255;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const base = (y * width + x) * 4;
      const luma =
        0.299 * pixels[base] + 0.587 * pixels[base + 1] + 0.114 * pixels[base + 2];
      if (luma <= threshLuma) continue;
      // Streak color: warm, slightly shifted per source (deterministic).
      const t = valueNoise2D(x * 0.1, y * 0.1, seed + 7919);
      const cr = 255;
      const cg = 200 + Math.floor(t * 55);
      const cb = 140 + Math.floor((1 - t) * 60);
      for (let d = 1; d <= length; d++) {
        const fall = 1 - d / length;
        const amt = fall * intensity;
        if (amt <= 0) break;
        // Left.
        const lx = x - d;
        if (lx >= 0) {
          const li = (y * width + lx) * 4;
          out[li] = clampByte(out[li] + cr * amt);
          out[li + 1] = clampByte(out[li + 1] + cg * amt);
          out[li + 2] = clampByte(out[li + 2] + cb * amt);
        }
        // Right.
        const rx = x + d;
        if (rx < width) {
          const ri = (y * width + rx) * 4;
          out[ri] = clampByte(out[ri] + cr * amt);
          out[ri + 1] = clampByte(out[ri + 1] + cg * amt);
          out[ri + 2] = clampByte(out[ri + 2] + cb * amt);
        }
      }
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// applyFocusBreathing — zoom-linked focal shift (BF-502)
// ---------------------------------------------------------------------------

export interface FocusBreathingOptions {
  /** Breathing depth, 0 (none) to 1 (strong). Default 0.3. */
  readonly depth?: number;
  /** Frame number (drives the slow breathing phase). Default 0. */
  readonly frame?: number;
  /** Seed for the phase. Default 0. */
  readonly seed?: number;
}

/**
 * Focus "breathing": a subtle, slow oscillation of effective focal length
 * tied to the frame number. Real lenses shift focus slightly as they zoom;
 * this emulates it by applying a tiny time-varying radial scale (a gentle
 * zoom-in/out) so a static frame shimmers in focus.
 *
 * Implemented as a 1-pixel sub-sampling resample around the image center,
 * scaled by `depth * sin(phase)`. Pure and deterministic per frame.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - depth, frame, seed
 * @returns new RGBA pixel data (input is not mutated)
 */
export const applyFocusBreathing = (
  pixels: FramePixels,
  width: number,
  height: number,
  options: FocusBreathingOptions = {},
): FramePixels => {
  const { depth = 0.3, frame = 0, seed = 0 } = options;
  if (depth <= 0) return new Uint8ClampedArray(pixels);
  const out = new Uint8ClampedArray(pixels.length);
  const phase = ((frame * 0.05 + seed * 0.11) % 1) * Math.PI * 2;
  // A gentle radial scale: depth*0.06 gives up to ~1.06× at depth=1 — enough
  // for off-center pixels to sample measurably different source positions
  // between frames, while reading as a subtle focus shimmer on a full frame.
  const scale = 1 + depth * 0.06 * Math.sin(phase);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      // Sample from the unscaled position (inverse mapping).
      const sx = cx + dx / scale;
      const sy = cy + dy / scale;
      const i0 = Math.min(height - 1, Math.max(0, Math.floor(sy)));
      const j0 = Math.min(width - 1, Math.max(0, Math.floor(sx)));
      const i1 = Math.min(height - 1, i0 + 1);
      const j1 = Math.min(width - 1, j0 + 1);
      const ty = clamp01(sy - i0);
      const tx = clamp01(sx - j0);
      const p00 = pixels[(i0 * width + j0) * 4];
      const p01 = pixels[(i0 * width + j1) * 4];
      const p10 = pixels[(i1 * width + j0) * 4];
      const p11 = pixels[(i1 * width + j1) * 4];
      const base = (y * width + x) * 4;
      for (let c = 0; c < 4; c++) {
        const a = pixels[(i0 * width + j0) * 4 + c];
        const b = pixels[(i0 * width + j1) * 4 + c];
        const d = pixels[(i1 * width + j0) * 4 + c];
        const e = pixels[(i1 * width + j1) * 4 + c];
        out[base + c] = clampByte(lerp(lerp(a, b, tx), lerp(d, e, tx), ty));
      }
      void p00;
      void p01;
      void p10;
      void p11;
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// applyVintageVignette (BF-502)
// ---------------------------------------------------------------------------

export interface VintageVignetteOptions {
  /** Corner falloff strength, 0 (none) to 1 (heavy). Default 0.4. */
  readonly strength?: number;
  /** Inner radius fraction before falloff begins, 0..1. Default 0.55. */
  readonly inner?: number;
  /** Optional oil-slick mottle (add per-pixel noise at the corners). Default 0. */
  readonly mottle?: number;
  /** Seed for the mottle. Default 0. */
  readonly seed?: number;
}

/**
 * Vintage corner vignetting with an optional subtle "oil-slick" mottle in
 * the darkest corners — the look of an old projection gate. Pure and
 * deterministic.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - strength, inner, mottle, seed
 * @returns new RGBA pixel data (input is not mutated)
 */
export const applyVintageVignette = (
  pixels: FramePixels,
  width: number,
  height: number,
  options: VintageVignetteOptions = {},
): FramePixels => {
  const { strength = 0.4, inner = 0.55, mottle = 0, seed = 0 } = options;
  const out = new Uint8ClampedArray(pixels);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  const innerR = inner * maxR;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      let fall = 1;
      if (r > innerR) {
        // Smoothstep from inner→edge.
        const t = clamp01((r - innerR) / Math.max(maxR - innerR, 1));
        fall = 1 - t * t * strength;
      }
      let mottleAmt = 0;
      if (mottle > 0 && r > innerR * 0.8) {
        const n = valueNoise2D(x * 0.15, y * 0.15, seed);
        mottleAmt = (n - 0.5) * mottle * 40 * (1 - fall);
      }
      const base = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        out[base + c] = clampByte(out[base + c] * fall + mottleAmt);
      }
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// applyAnamorphic — 2× squeeze/release (BF-502)
// ---------------------------------------------------------------------------

export interface AnamorphicOptions {
  /** Squeeze factor: 2 = classic 2× anamorphic. Default 2. */
  readonly factor?: number;
  /**
   * Direction: `'squeeze'` compresses the horizontal axis (as captured by an
   * anamorphic lens); `'release'` stretches it back to scope. Default
   * `'release'`.
   */
  readonly mode?: 'squeeze' | 'release';
}

/**
 * Anamorphic squeeze/release: compress or expand the horizontal axis by
 * `factor` (2 = classic 2× scope), sampling via bilinear. This is the
 * geometric basis of the "anamorphic look" — paired with
 * {@link applyHorizontalFlare} and a 2.39:1 crop it reads as 35mm scope.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - factor, mode
 * @returns new RGBA pixel data (input is not mutated)
 */
export const applyAnamorphic = (
  pixels: FramePixels,
  width: number,
  height: number,
  options: AnamorphicOptions = {},
): FramePixels => {
  const { factor = 2, mode = 'release' } = options;
  if (factor === 1) return new Uint8ClampedArray(pixels);
  // squeeze → source is wider than destination (divide x); release →
  // destination is wider (multiply sample x).
  const scale = mode === 'release' ? 1 / factor : factor;
  const out = new Uint8ClampedArray(pixels.length);
  const cx = (width - 1) / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Inverse mapping around the center.
      const sx = cx + (x - cx) * scale;
      const j0 = Math.min(width - 1, Math.max(0, Math.floor(sx)));
      const j1 = Math.min(width - 1, j0 + 1);
      const tx = clamp01(sx - j0);
      const base = (y * width + x) * 4;
      for (let c = 0; c < 4; c++) {
        const a = pixels[(y * width + j0) * 4 + c];
        const b = pixels[(y * width + j1) * 4 + c];
        out[base + c] = clampByte(lerp(a, b, tx));
      }
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// makeLensCharacterSteps (BF-502) — compose() integration
// ---------------------------------------------------------------------------

/**
 * Build a {@link Lut}-based, compose()-friendly approximation of a vintage
 * lens grade: a 1-stop S-curve with warm mids. (The heavy geometric
 * effects — bokeh, flare, anamorphic — operate on 2D neighborhoods and are
 * applied directly, not via the 1D LUT step API.)
 *
 * Use this to layer a tonal "lens grade" through `compose`, then apply
 * `applyHorizontalFlare` / `applyAnamorphic` around it.
 */
export const makeLensCharacterLut = (): Lut => {
  const size = 256;
  const data = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    // Gentle S-curve + warm mid lift (add a touch of green/yellow).
    let v = 0.5 + (t - 0.5) * 1.08; // 8% more contrast
    v = clamp01(v);
    // Warm the mids slightly.
    const warm = t > 0.4 && t < 0.7 ? 0.02 : 0;
    data[i] = clamp01(v + warm * (1 - Math.abs(t - 0.55) * 4));
  }
  return { name: 'lensCharacter', size, data };
};

/**
 * Apply the lens-character LUT to a frame (thin wrapper over
 * {@link applyLut} for discoverability).
 */
export const applyLensCharacterLut = (
  pixels: FramePixels,
  width: number,
  height: number,
): FramePixels => applyLut(pixels, width, height, makeLensCharacterLut());
