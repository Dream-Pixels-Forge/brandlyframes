/**
 * BF-507 — emotion curve driving per-frame visual treatment, for
 * @brandlyframes/fx.
 *
 * A global "mood" parameter (valence/arousal, -1..1) is sampled on a
 * per-frame basis from a keyframed curve, then converted into concrete
 * visual treatment: a color grade (LUT), a camera-speed multiplier, and a
 * typography weight. This is the interpolation-table + LUT-generator half
 * of the emotion feature; the React `<EmotionCurve>` component that
 * keyframes live in `@brandlyframes/core` (see the GOAL_00 entry).
 *
 * All functions are pure, deterministic, and side-effect-free:
 * same curve + same frame → same output. No `Math.random`, no wall clock.
 */

import {
  applyLut,
  type FramePixels,
  type Lut,
} from './fx';
export type { FramePixels };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single emotion sample: time + a 2-axis mood value.
 *
 * `valence` (horizontal axis): -1 (negative/harsh) … 0 (neutral) … +1
 * (positive/warm). Drives color temperature and contrast.
 *
 * `arousal` (vertical axis): -1 (calm/flat) … 0 (resting) … +1
 * (intense/loud). Drives saturation, bloom tendency, and camera speed.
 */
export interface EmotionPoint {
  /** Frame at which this sample applies. */
  readonly frame: number;
  /** Valence: -1 … 1. Default 0. */
  readonly valence?: number;
  /** Arousal: -1 … 1. Default 0. */
  readonly arousal?: number;
}

/**
 * An emotion curve: an ordered list of samples. Interpolation is linear
 * between consecutive samples; frames before the first sample clamp to
 * the first value, frames after the last clamp to the last value.
 */
export interface EmotionCurve {
  readonly points: readonly EmotionPoint[];
}

/** Resolved mood at a single frame (fully clamped). */
export interface EmotionSample {
  /** Valence in [-1, 1]. */
  readonly valence: number;
  /** Arousal in [-1, 1]. */
  readonly arousal: number;
}

/** Concrete visual treatment derived from an emotion sample. */
export interface EmotionTreatment {
  /** Suggested LUT to apply (use with `applyLut` / `applyEmotionFrame`). */
  readonly lut: Lut;
  /** Camera speed multiplier (1 = neutral; <1 slows, >1 speeds up). */
  readonly speedMultiplier: number;
  /** Suggested font-weight 100..900. */
  readonly typographyWeight: number;
  /** The source sample, for reference. */
  readonly sample: EmotionSample;
}

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// ---------------------------------------------------------------------------
// Core sampling
// ---------------------------------------------------------------------------

/**
 * Sample an {@link EmotionCurve} at a given frame. Linear interpolation
 * between consecutive samples; clamped at the ends. Pure function.
 *
 * @param curve - the keyframed mood curve
 * @param frame - the frame number to sample
 * @returns a fully clamped `EmotionSample`
 */
export const sampleEmotionCurve = (curve: EmotionCurve, frame: number): EmotionSample => {
  const pts = curve.points;
  if (pts.length === 0) return { valence: 0, arousal: 0 };
  if (pts.length === 1 || frame <= (pts[0]?.frame ?? 0)) {
    const p = pts[0];
    return {
      valence: clamp(p?.valence ?? 0, -1, 1),
      arousal: clamp(p?.arousal ?? 0, -1, 1),
    };
  }
  const last = pts[pts.length - 1];
  if (frame >= (last?.frame ?? 0)) {
    return {
      valence: clamp(last?.valence ?? 0, -1, 1),
      arousal: clamp(last?.arousal ?? 0, -1, 1),
    };
  }
  // Binary search for the bracketing pair.
  let lo = 0;
  let hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((pts[mid]?.frame ?? 0) <= frame) lo = mid;
    else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  const fa = a?.frame ?? 0;
  const fb = b?.frame ?? 0;
  const t = fb === fa ? 0 : (frame - fa) / (fb - fa);
  return {
    valence: clamp(lerp(a?.valence ?? 0, b?.valence ?? 0, t), -1, 1),
    arousal: clamp(lerp(a?.arousal ?? 0, b?.arousal ?? 0, t), -1, 1),
  };
};

// ---------------------------------------------------------------------------
// Treatment generation (LUT + speed + typography)
// ---------------------------------------------------------------------------

/**
 * Build a 256-entry LUT for a given (valence, arousal) mood.
 *
 * - Valence shifts the color temperature: negative → cool (blue bias on
 *   highlights, warm mids); positive → warm (orange bias on highlights).
 * - Arousal shifts contrast and saturation: high arousal → wider S-curve,
 *   deeper blacks, hotter whites; low arousal → flattened, desaturated.
 *
 * The LUT is a per-channel 256-entry table; we approximate temperature
 * with a slight R/B channel split, and saturation by pulling toward the
 * 128 (neutral gray) value.
 *
 * @param valence - -1..1
 * @param arousal - -1..1
 * @returns a 256-entry LUT (R=G=B single channel; apply via `applyLut`)
 */
export const emotionLut = (valence: number, arousal: number): Lut => {
  const v = clamp(valence, -1, 1);
  const a = clamp(arousal, -1, 1);
  const size = 256;
  const data = new Float32Array(size);

  // Contrast: arousal -1 → 0.85 (flat), +1 → 1.18 (punchy).
  const contrast = 0.85 + (a + 1) * 0.5 * 0.165; // 0.85 .. 1.18
  // Temperature shift on the top of the LUT: valence +1 → warm (+0.03 R,
  // -0.02 B on highlights); -1 → cool.
  const warm = v * 0.04;
  // Slight lift in the mids for positive valence (optimistic lift).
  const midLift = Math.max(0, v) * 0.03;

  for (let i = 0; i < size; i++) {
    const x = i / (size - 1);
    // S-curve pivoting on 0.5 with shadow/highlight anchoring: the
    // endpoints (x=0, x=1) stay at 0 and 1 so a neutral LUT is a true
    // identity; contrast only acts in the mids.
    const s = 0.5 + (x - 0.5) * contrast;
    // Blend between x (identity) and s (full S-curve), weighted by how far
    // we are from the endpoints — endpoints stay anchored at 0/1.
    const endWeight = 1 - Math.abs(x - 0.5) * 2; // 0 at endpoints, 1 at center
    let t = lerp(x, s, endWeight);
    // Saturation pull at low arousal: pull mids toward the identity line
    // (desaturated look), anchored at endpoints so shadows/highlights stay.
    const sat = Math.abs(a);
    if (sat < 0.5 && endWeight > 0) {
      t = lerp(t, x, (0.5 - sat) * endWeight * 0.6);
    }
    // Warm/cool tilt: acts on the top third only.
    if (x > 0.7) t = t + (x - 0.7) * warm;
    // Mid lift (positive valence): bell-shaped around 0.5.
    if (midLift > 0) t = t + midLift * Math.sin(t * Math.PI);
    data[i] = clamp(t, 0, 1);
  }
  return {
    name: `emotion(${v.toFixed(2)},${a.toFixed(2)})`,
    size,
    data,
  };
};

/**
 * Resolve a full {@link EmotionTreatment} for a given sample: LUT, camera
 * speed multiplier, and typography weight.
 *
 * Speed: high arousal → 1.25× (faster cuts / time-lapse feel),
 * low arousal → 0.75× (lingering). Linear in arousal.
 *
 * Typography weight: high arousal → 700-900, low arousal → 300. Valence
 * has no direct effect on weight.
 *
 * @param sample - a clamped emotion sample
 * @returns a concrete, apply-ready treatment
 */
export const emotionTreatment = (sample: EmotionSample): EmotionTreatment => {
  const v = clamp(sample.valence, -1, 1);
  const a = clamp(sample.arousal, -1, 1);
  return {
    lut: emotionLut(v, a),
    speedMultiplier: 1 + a * 0.25, // 0.75 .. 1.25
    typographyWeight: 400 + Math.round(a * 300), // 100 .. 700
    sample,
  };
};

// ---------------------------------------------------------------------------
// Frame-level application
// ---------------------------------------------------------------------------

/**
 * Sample the curve at `frame` and apply the resulting LUT to a frame.
 * Pure function — same input → byte-identical output.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param curve - the emotion curve
 * @param frame - the frame number
 * @returns new RGBA pixel data (input is not mutated)
 */
export const applyEmotionFrame = (
  pixels: FramePixels,
  width: number,
  height: number,
  curve: EmotionCurve,
  frame: number,
): FramePixels => {
  const sample = sampleEmotionCurve(curve, frame);
  const treatment = emotionTreatment(sample);
  return applyLut(pixels, width, height, treatment.lut);
};

/**
 * Convenience: sample + treatment in one call, no LUT application.
 */
export const emotionAtFrame = (curve: EmotionCurve, frame: number): EmotionTreatment =>
  emotionTreatment(sampleEmotionCurve(curve, frame));
