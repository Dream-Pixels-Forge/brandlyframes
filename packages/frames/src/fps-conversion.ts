/**
 * FPS conversion modes [BF-055] — exact / nearest / blend frame-index
 * mapping between two rational frame-rate timelines.
 *
 * `convertFrameIndex` maps a composition frame index `n` on the `dstFps`
 * timeline back to source frame index(es) on the `srcFps` timeline. All
 * arithmetic is exact BigInt rational math — no floating-point
 * multiplication — so NTSC rates (e.g. 24000/1001) convert without drift.
 *
 * Clean-room implementation. Reuses {@link Rational} and
 * {@link validateRational} from the package root [BF-051].
 */

import { validateRational, type Rational } from './index';

/**
 * Frame-mapping strategy for fps conversion [BF-055].
 *
 * - `'exact'` — source and destination rates must form an integer ratio
 *   (`srcFps / dstFps` is an integer), so every composition frame lands
 *   exactly on a source frame. Throws otherwise; callers should fall back
 *   to `'nearest'`.
 * - `'nearest'` — round the exact source-frame position to the closest
 *   integer. Ties at exactly `k + 0.5` round DOWN to the earlier frame
 *   `k` (causal: at time `t` the displayed source frame is the one whose
 *   half-open interval `[k/srcFps, (k+1)/srcFps)` contains `t`).
 * - `'blend'` — return the pair of neighboring source frames
 *   `[floor(p), floor(p) + 1]` for linear interpolation; degenerates to
 *   `[p, p]` when `p` is exactly an integer (no blending needed).
 */
export type FpsConversionMode = 'exact' | 'nearest' | 'blend';

/**
 * Greatest common divisor of two BigInts (Euclidean algorithm).
 *
 * @param a - first operand
 * @param b - second operand
 * @returns non-negative gcd; `gcd(0n, 0n) === 0n`
 */
const gcd = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
};

/**
 * Maps composition frame `n` (on the `dstFps` timeline) to the source
 * frame index on the `srcFps` timeline [BF-055].
 *
 * Composition time of frame `n` is `t = n / dstFps`, and the exact source
 * frame position is `p = t * srcFps = n * srcFps.num * dstFps.den /
 * (dstFps.num * srcFps.den)` — a rational product evaluated in BigInt, so
 * there is no float drift for any rational rate, including NTSC pairs
 * such as 60000/1001 → 30000/1001.
 *
 * - `'nearest'` returns `round(p)` with ties at `k + 0.5` rounded DOWN to
 *   the earlier frame `k`.
 * - `'exact'` requires `srcFps / dstFps` to be an integer (then `p` is an
 *   integer for every `n`); otherwise it throws — fall back to `'nearest'`
 *   (or use `'blend'` for interpolation).
 * - `'blend'` returns `[floor(p), floor(p) + 1]`, or `[p, p]` when `p` is
 *   exactly an integer.
 *
 * @param n - composition frame index (non-negative safe integer) on the
 *   dstFps timeline
 * @param srcFps - source frame rate (rational, e.g. `{ num: 30000, den: 1001 }`)
 * @param dstFps - destination/composition frame rate (rational)
 * @param mode - conversion mode: `'exact'`, `'nearest'`, or `'blend'`
 * @returns source frame index (`number`) for `'exact'`/`'nearest'`, or the
 *   neighboring pair `[lower, upper]` (`[number, number]`) for `'blend'`
 * @throws {Error} if `srcFps` or `dstFps` fails {@link validateRational};
 *   if `n` is not a non-negative safe integer; if `mode` is not a known
 *   {@link FpsConversionMode}; if `mode` is `'exact'` and
 *   `srcFps / dstFps` is not an integer ratio (message documents the
 *   `'nearest'` fallback); or if the mapped index exceeds
 *   `Number.MAX_SAFE_INTEGER`
 */
export const convertFrameIndex = (
  n: number,
  srcFps: Rational,
  dstFps: Rational,
  mode: FpsConversionMode,
): number | [number, number] => {
  validateRational(srcFps);
  validateRational(dstFps);
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error(`n must be a non-negative safe integer, got ${n}`);
  }
  if (mode !== 'exact' && mode !== 'nearest' && mode !== 'blend') {
    throw new Error(
      `Unknown FpsConversionMode ${String(mode)}; expected 'exact', 'nearest', or 'blend'`,
    );
  }

  // Exact source-frame position p = num / den where
  // p = n * srcFps / dstFps = n * src.num * dst.den / (dst.num * src.den).
  const num = BigInt(n) * BigInt(srcFps.num) * BigInt(dstFps.den);
  const den = BigInt(dstFps.num) * BigInt(srcFps.den);

  const toSafeIndex = (value: bigint): number => {
    const index = Number(value);
    if (!Number.isSafeInteger(index)) {
      throw new Error(`Converted frame index ${value} exceeds Number.MAX_SAFE_INTEGER`);
    }
    return index;
  };

  switch (mode) {
    case 'nearest': {
      // Round half DOWN: floor(p + 1/2), then subtract 1 when p is
      // exactly k + 1/2 so ties resolve to the earlier source frame.
      const halfUp = (2n * num + den) / (2n * den);
      const twiceP = 2n * num;
      const isExactHalf = twiceP % den === 0n && (twiceP / den) % 2n === 1n;
      return toSafeIndex(halfUp - (isExactHalf ? 1n : 0n));
    }
    case 'exact': {
      // p is an integer for every n iff srcFps/dstFps is an integer.
      const ratioNum = BigInt(srcFps.num) * BigInt(dstFps.den);
      const ratioDen = BigInt(dstFps.num) * BigInt(srcFps.den);
      if (ratioNum % ratioDen !== 0n) {
        const g = gcd(ratioNum, ratioDen);
        throw new Error(
          `convertFrameIndex 'exact' requires srcFps/dstFps to be an integer ratio, got ${
            ratioNum / g
          }/${ratioDen / g}; fall back to 'nearest' (or use 'blend') for non-integer ratios`,
        );
      }
      // num / den is exact integer division (ratio is integral for all n).
      return toSafeIndex(num / den);
    }
    case 'blend': {
      // BigInt division truncates toward zero; num >= 0 so this is floor.
      const lower = num / den;
      const isExact = num % den === 0n;
      return [toSafeIndex(lower), toSafeIndex(isExact ? lower : lower + 1n)];
    }
  }
};
