/**
 * VFR normalization via PTS table [BF-056] — resample a variable-frame-rate
 * source onto a constant-frame-rate timeline.
 *
 * A PTS table pins each source frame to an exact presentation timestamp on
 * the package 90 kHz timescale. {@link normalizeToCfr} maps every CFR
 * destination frame to the nearest source frame using exact BigInt rational
 * arithmetic — no floating point — so NTSC rates never drift.
 *
 * Clean-room implementation. Reuses {@link Rational},
 * {@link validateRational}, and {@link PTS_DENOMINATOR} from the package
 * root [BF-051].
 */

import { PTS_DENOMINATOR, validateRational, type Rational } from './index';

/**
 * Presentation-timestamp table for a VFR source.
 *
 * `pts[i]` is the presentation timestamp of source frame `i`, expressed in
 * ticks on the given `timescale` (ticks per second). `buildPtsTable`
 * produces tables on the package 90 kHz timescale ({@link PTS_DENOMINATOR}).
 */
export interface PtsTable {
  /** Per-frame presentation timestamps, strictly increasing, in timescale ticks. */
  pts: bigint[];
  /** Ticks per second for the `pts` values (90 kHz for built tables). */
  timescale: bigint;
}

/**
 * Builds a {@link PtsTable} from raw timestamps on the package 90 kHz timescale.
 *
 * Each entry is converted with `BigInt(...)`: `bigint` entries pass through,
 * `number` entries must be non-negative safe integers (fractional, NaN, or
 * non-safe-integer numbers throw). The converted sequence must be non-empty,
 * all non-negative, and strictly increasing.
 *
 * @param timestamps - per-frame timestamps (`bigint` or `number` mix)
 * @returns PTS table with `timescale = PTS_DENOMINATOR` (90 kHz)
 * @throws {Error} if the list is empty, contains a negative, non-integer,
 *   or non-safe-integer entry, or is not strictly increasing after conversion
 */
export const buildPtsTable = (timestamps: (bigint | number)[]): PtsTable => {
  if (timestamps.length === 0) {
    throw new Error('buildPtsTable requires a non-empty timestamp list');
  }
  const pts: bigint[] = timestamps.map((t, index) => {
    if (typeof t === 'number') {
      if (!Number.isSafeInteger(t) || t < 0) {
        throw new Error(
          `timestamp at index ${index} must be a non-negative safe integer, got ${String(t)}`,
        );
      }
      return BigInt(t);
    }
    if (t < 0n) {
      throw new Error(`timestamp at index ${index} must be non-negative, got ${String(t)}`);
    }
    return t;
  });
  for (let i = 1; i < pts.length; i += 1) {
    const prev = pts[i - 1] as bigint;
    const curr = pts[i] as bigint;
    if (curr <= prev) {
      throw new Error(
        `timestamps must be strictly increasing at index ${i}`,
      );
    }
  }
  return { pts, timescale: PTS_DENOMINATOR };
};


/**
 * Returns the PTS of source frame `frame`.
 *
 * Out-of-range composition frames never throw and never produce a blank:
 * negative frames clamp to `pts[0]` and frames past the end clamp to
 * `pts[len - 1]`.
 *
 * @param table - PTS table to read from
 * @param frame - source frame index (must be an integer; may be out of range)
 * @returns PTS in the table's timescale ticks
 * @throws {Error} if `frame` is not an integer
 */
export const ptsTableLookup = (table: PtsTable, frame: number): bigint => {
  if (!Number.isInteger(frame)) {
    throw new Error(`frame must be an integer, got ${String(frame)}`);
  }
  const pts = table.pts;
  if (frame <= 0) {
    return pts[0] as bigint;
  }
  if (frame >= pts.length - 1) {
    return pts[pts.length - 1] as bigint;
  }
  return pts[frame] as bigint;
};

/**
 * Resamples a VFR PTS table onto a constant-frame-rate timeline.
 *
 * The destination has `J = ceil(ptsLast * fps.num / (fps.den * timescale))`
 * frames, where `ptsLast` is the final source PTS. Destination frame `j`
 * has nominal PTS `j * timescale * fps.den / fps.num`; it maps to the
 * source frame `i` whose PTS is closest to that nominal value. Distances
 * are compared with exact BigInt cross-multiplication — no float.
 *
 * Tie-breaking policy: an exact tie between two adjacent source frames
 * resolves toward the LATER source frame (half-up). Equivalently, each
 * destination frame maps to the source frame whose half-open influence
 * interval contains its nominal time, with interval boundaries owned by
 * the later frame — a causal hold-current-frame-until-midpoint rule.
 *
 * @param table - VFR source PTS table
 * @param targetFps - destination constant frame rate (validated rational)
 * @returns `{ frame }`, the CFR frame to source-frame map: length `J`,
 *   every entry a valid source index in `[0, len - 1]`
 * @throws {Error} if `targetFps` is not a valid rational
 */
export const normalizeToCfr = (
  table: PtsTable,
  targetFps: Rational,
): { frame: number[] } => {
  validateRational(targetFps);
  const pts = table.pts;
  const timescale = table.timescale;
  const fpsNum = BigInt(targetFps.num);
  const fpsDen = BigInt(targetFps.den);
  const ptsLast = pts[pts.length - 1] as bigint;
  const numer = ptsLast * fpsNum;
  const denom = fpsDen * timescale;
  const count = Number((numer + denom - 1n) / denom);
  const span = timescale * fpsDen;
  const dist = (i: number, j: number): bigint => {
    const d = (pts[i] as bigint) * fpsNum - BigInt(j) * span;
    return d < 0n ? -d : d;
  };
  const frame: number[] = [];
  let best = 0;
  for (let j = 0; j < count; j += 1) {
    while (best + 1 < pts.length && dist(best + 1, j) <= dist(best, j)) {
      best += 1;
    }
    frame.push(best);
  }
  return { frame };
};
