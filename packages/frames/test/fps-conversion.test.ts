import { describe, it, expect } from 'vitest';
import { convertFrameIndex, type FpsConversionMode, type Rational } from '../src/index';

/**
 * FPS conversion modes [BF-055]: exact / nearest / blend.
 *
 * `convertFrameIndex` maps a composition frame index n on the dstFps
 * timeline back to source frame index(es) on the srcFps timeline. The
 * composition time of frame n is t = n / dstFps, and the source-frame
 * position is p = t * srcFps = n * srcFps/dstFps, computed with exact
 * BigInt rational arithmetic (no float multiplication), so NTSC rates
 * such as 30000/1001 never drift.
 *
 * Mode semantics under test:
 * - 'nearest': round p to the closest integer source frame. Ties at
 *   exactly k + 0.5 round DOWN to the earlier frame (k), so upsampling
 *   30 -> 60 shows the frame current at time t (causal, ffmpeg-style).
 * - 'exact': valid only when srcFps/dstFps is an integer ratio (then p
 *   is an integer for every n); otherwise throws and callers should
 *   fall back to 'nearest'.
 * - 'blend': [floor(p), floor(p) + 1] neighbor pair for linear
 *   interpolation; degenerates to [p, p] when p is exactly integer.
 */

const FPS_60: Rational = { num: 60, den: 1 };
const FPS_30: Rational = { num: 30, den: 1 };
const FPS_24: Rational = { num: 24, den: 1 };
const FPS_25: Rational = { num: 25, den: 1 };
const NTSC_60: Rational = { num: 60000, den: 1001 };
const NTSC_30: Rational = { num: 30000, den: 1001 };
const NTSC_24: Rational = { num: 24000, den: 1001 };

describe('convertFrameIndex [BF-055]', () => {
  describe("mode 'nearest'", () => {
    it('60 -> 30 maps frames 0..10 to [0, 2, 4, ..., 20]', () => {
      const actual = Array.from({ length: 11 }, (_, n) =>
        convertFrameIndex(n, FPS_60, FPS_30, 'nearest'),
      );
      expect(actual).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    });

    it('30 -> 60: frame 1 (p = 0.5) ties DOWN to 0; frame 2 -> 1', () => {
      expect(convertFrameIndex(1, FPS_30, FPS_60, 'nearest')).toBe(0);
      expect(convertFrameIndex(2, FPS_30, FPS_60, 'nearest')).toBe(1);
    });

    it('30 -> 60 follows the causal floor-like pattern 0,0,1,1,2,2,...', () => {
      const actual = Array.from({ length: 8 }, (_, n) =>
        convertFrameIndex(n, FPS_30, FPS_60, 'nearest'),
      );
      expect(actual).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    });

    it('returns a single number (not a pair)', () => {
      const result = convertFrameIndex(0, FPS_60, FPS_30, 'nearest');
      expect(typeof result).toBe('number');
    });

    it('NTSC 30000/1001 -> 24000/1001: exact-rational indices for n = 0..10 (no float drift)', () => {
      // p = n * (30000/1001) / (24000/1001) = n * 5/4 = 1.25n exactly.
      // Hand-computed with half-down rounding:
      //   n:     0  1    2    3    4  5    6    7    8  9   10
      //   p:     0  1.25 2.50 3.75 5  6.25 7.50 8.75 10 11.25 12.50
      //   near:  0  1    2    4    5  6    7    9    10 11   12
      const expected = [0, 1, 2, 4, 5, 6, 7, 9, 10, 11, 12];
      const actual = Array.from({ length: 11 }, (_, n) =>
        convertFrameIndex(n, NTSC_30, NTSC_24, 'nearest'),
      );
      expect(actual).toEqual(expected);

      // Independent BigInt cross-check of the same mapping, computed from
      // the raw (unreduced) rational product inside the test itself.
      const srcNum = BigInt(NTSC_30.num);
      const srcDen = BigInt(NTSC_30.den);
      const dstNum = BigInt(NTSC_24.num);
      const dstDen = BigInt(NTSC_24.den);
      for (let n = 0; n <= 10; n += 1) {
        const num = BigInt(n) * srcNum * dstDen; // p = num / den
        const den = dstNum * srcDen;
        // Round half down: floor(p + 1/2) minus 1 when p is exactly k + 1/2.
        const twiceP = 2n * num;
        const halfUp = (twiceP + den) / (2n * den);
        const isExactHalf = twiceP % den === 0n && (twiceP / den) % 2n === 1n;
        const nearest = halfUp - (isExactHalf ? 1n : 0n);
        expect(convertFrameIndex(n, NTSC_30, NTSC_24, 'nearest')).toBe(Number(nearest));
      }
    });

    it('never returns a pair in nearest mode across a rate sweep', () => {
      const pairs: ReadonlyArray<readonly [Rational, Rational]> = [
        [FPS_60, FPS_30],
        [FPS_30, FPS_60],
        [FPS_24, FPS_25],
        [NTSC_30, NTSC_24],
      ];
      for (const [src, dst] of pairs) {
        for (let n = 0; n < 20; n += 1) {
          expect(typeof convertFrameIndex(n, src, dst, 'nearest')).toBe('number');
        }
      }
    });
  });
  describe("mode 'exact'", () => {
    it('60 -> 30 works (ratio 2) and matches nearest: [0, 2, 4, ..., 20]', () => {
      const actual = Array.from({ length: 11 }, (_, n) =>
        convertFrameIndex(n, FPS_60, FPS_30, 'exact'),
      );
      expect(actual).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    });

    it('NTSC 60000/1001 -> 30000/1001: ratio is exactly 2, no drift over 200 frames', () => {
      for (let n = 0; n < 200; n += 1) {
        expect(convertFrameIndex(n, NTSC_60, NTSC_30, 'exact')).toBe(2 * n);
      }
    });

    it('returns a single number (not a pair)', () => {
      expect(typeof convertFrameIndex(0, FPS_60, FPS_30, 'exact')).toBe('number');
    });

    it('throws for non-integer ratio 30 -> 24 and documents the nearest fallback', () => {
      expect(() => convertFrameIndex(1, FPS_30, FPS_24, 'exact')).toThrow(/integer ratio/i);
      expect(() => convertFrameIndex(1, FPS_30, FPS_24, 'exact')).toThrow(/nearest/);
    });

    it('throws for non-integer ratio 30 -> 60 (up-conversion is not an exact integer multiple)', () => {
      expect(() => convertFrameIndex(1, FPS_30, FPS_60, 'exact')).toThrow(/integer ratio/i);
    });

    it('throws even for n = 0 when the ratio is non-integer (ratio-level contract)', () => {
      expect(() => convertFrameIndex(0, FPS_30, FPS_24, 'exact')).toThrow();
    });
  });

  describe("mode 'blend'", () => {
    it('30 -> 60 frame 1 (p = 0.5) returns the neighbor pair [0, 1]', () => {
      expect(convertFrameIndex(1, FPS_30, FPS_60, 'blend')).toEqual([0, 1]);
    });

    it('returns the degenerate pair [p, p] when p is exactly integer', () => {
      expect(convertFrameIndex(2, FPS_30, FPS_60, 'blend')).toEqual([1, 1]); // p = 1
      expect(convertFrameIndex(1, FPS_60, FPS_30, 'blend')).toEqual([2, 2]); // p = 2
      expect(convertFrameIndex(0, NTSC_30, NTSC_24, 'blend')).toEqual([0, 0]); // p = 0
      expect(convertFrameIndex(4, NTSC_30, NTSC_24, 'blend')).toEqual([5, 5]); // p = 5
    });

    it('NTSC 30000/1001 -> 24000/1001 brackets p = 1.25n with floor pairs', () => {
      expect(convertFrameIndex(1, NTSC_30, NTSC_24, 'blend')).toEqual([1, 2]); // p = 1.25
      expect(convertFrameIndex(2, NTSC_30, NTSC_24, 'blend')).toEqual([2, 3]); // p = 2.50
      expect(convertFrameIndex(3, NTSC_30, NTSC_24, 'blend')).toEqual([3, 4]); // p = 3.75
    });

    it('always returns integers with lower <= upper and upper - lower <= 1', () => {
      const pairs: ReadonlyArray<readonly [Rational, Rational]> = [
        [FPS_60, FPS_30],
        [FPS_30, FPS_60],
        [FPS_24, FPS_25],
        [FPS_25, FPS_24],
        [NTSC_30, NTSC_24],
        [NTSC_60, NTSC_30],
      ];
      for (const [src, dst] of pairs) {
        for (let n = 0; n < 50; n += 1) {
          const result = convertFrameIndex(n, src, dst, 'blend');
          expect(Array.isArray(result)).toBe(true);
          const [lower, upper] = result as [number, number];
          expect(Number.isInteger(lower)).toBe(true);
          expect(Number.isInteger(upper)).toBe(true);
          expect(lower).toBeLessThanOrEqual(upper);
          expect(upper - lower).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('validation', () => {
    it('rejects an invalid srcFps rational (reuses validateRational)', () => {
      expect(() => convertFrameIndex(0, { num: 30, den: 0 }, FPS_60, 'nearest')).toThrow();
      expect(() => convertFrameIndex(0, { num: 0, den: 1 }, FPS_60, 'nearest')).toThrow();
      expect(() => convertFrameIndex(0, { num: -30, den: 1 }, FPS_60, 'nearest')).toThrow();
      expect(() => convertFrameIndex(0, { num: 29.97, den: 1 }, FPS_60, 'nearest')).toThrow();
    });

    it('rejects an invalid dstFps rational (reuses validateRational)', () => {
      expect(() => convertFrameIndex(0, FPS_30, { num: 60, den: 0 }, 'nearest')).toThrow();
      expect(() => convertFrameIndex(0, FPS_30, { num: 60, den: -1 }, 'nearest')).toThrow();
      expect(() => convertFrameIndex(0, FPS_30, { num: 1.5, den: 1 }, 'nearest')).toThrow();
    });

    it('rejects a negative or non-integer frame index n', () => {
      expect(() => convertFrameIndex(-1, FPS_60, FPS_30, 'nearest')).toThrow();
      expect(() => convertFrameIndex(1.5, FPS_60, FPS_30, 'nearest')).toThrow();
    });

    it('rejects an unknown mode at runtime', () => {
      expect(() => convertFrameIndex(0, FPS_30, FPS_60, 'bogus' as FpsConversionMode)).toThrow(
        /mode/i,
      );
    });
  });
});

