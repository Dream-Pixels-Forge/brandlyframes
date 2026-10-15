import { describe, it, expect } from 'vitest';
import {
  frameToPts,
  ptsToFrame,
  validateRational,
  PTS_DENOMINATOR,
  type Rational,
} from '../src/index';

/**
 * Frame-exact timestamp mapping [BF-051].
 *
 * PTS is expressed on a 90 kHz timescale (PTS_DENOMINATOR = 90000n ticks
 * per second). One frame of duration fps.den/fps.num seconds occupies
 * 90000 * fps.den / fps.num ticks, which is fractional for NTSC-style
 * rates (e.g. 24000/1001 -> 3753.75 ticks). `frameToPts` therefore uses
 * ceiling arithmetic so the result lands inside the frame's half-open
 * tick interval [n*T, (n+1)*T), guaranteeing the round-trip identity
 * `ptsToFrame(frameToPts(n)) === n` with a floor-based inverse.
 */
const FPS_VALUES: ReadonlyArray<Rational> = [
  { num: 24, den: 1 },
  { num: 25, den: 1 },
  { num: 30, den: 1 },
  { num: 30000, den: 1001 },
  { num: 60000, den: 1001 },
  { num: 24000, den: 1001 },
];

describe('frames [BF-051]', () => {
  describe('PTS_DENOMINATOR', () => {
    it('is 90000n (90 kHz timescale)', () => {
      expect(PTS_DENOMINATOR).toBe(90000n);
    });
  });

  describe('validateRational', () => {
    it('accepts valid rational values', () => {
      expect(() => validateRational({ num: 24, den: 1 })).not.toThrow();
      expect(() => validateRational({ num: 30000, den: 1001 })).not.toThrow();
    });

    it('throws when den is 0', () => {
      expect(() => validateRational({ num: 30, den: 0 })).toThrow();
    });

    it('throws when den is negative', () => {
      expect(() => validateRational({ num: 30, den: -1 })).toThrow();
    });

    it('throws when num is 0 or negative', () => {
      expect(() => validateRational({ num: 0, den: 1 })).toThrow();
      expect(() => validateRational({ num: -24, den: 1 })).toThrow();
    });

    it('throws when num or den is not an integer', () => {
      expect(() => validateRational({ num: 29.97, den: 1 })).toThrow();
      expect(() => validateRational({ num: 30, den: 1.5 })).toThrow();
    });
  });

  describe('frameToPts', () => {
    it('maps frame 0 to 0n for every fps', () => {
      for (const fps of FPS_VALUES) {
        expect(frameToPts(0, fps)).toBe(0n);
      }
    });

    it('matches known values on the 90kHz timescale', () => {
      // 90000 * 1 / 30 = 3000 exactly
      expect(frameToPts(1, { num: 30, den: 1 })).toBe(3000n);
      // 90000 * 1 / 24 = 3750 exactly
      expect(frameToPts(1, { num: 24, den: 1 })).toBe(3750n);
      // 90000 * 2 / 25 = 7200 exactly
      expect(frameToPts(2, { num: 25, den: 1 })).toBe(7200n);
      // NTSC: 90000 * 1001 / 30000 = 3003 exactly
      expect(frameToPts(1, { num: 30000, den: 1001 })).toBe(3003n);
      // NTSC 23.976: 90000 * 1001 / 24000 = 3753.75 -> ceiling 3754
      expect(frameToPts(1, { num: 24000, den: 1001 })).toBe(3754n);
      // NTSC 59.94: 90000 * 1001 / 60000 = 1501.5 -> ceiling 1502
      expect(frameToPts(1, { num: 60000, den: 1001 })).toBe(1502n);
    });

    it('is strictly non-decreasing across 120 frames', () => {
      for (const fps of FPS_VALUES) {
        let previous = frameToPts(0, fps);
        for (let n = 1; n <= 120; n++) {
          const pts = frameToPts(n, fps);
          expect(pts > previous).toBe(true);
          previous = pts;
        }
      }
    });

    it('throws for a negative frame', () => {
      expect(() => frameToPts(-1, { num: 30, den: 1 })).toThrow();
    });

    it('throws for a non-integer frame', () => {
      expect(() => frameToPts(1.5, { num: 30, den: 1 })).toThrow();
    });

    it('throws for an invalid fps rational', () => {
      expect(() => frameToPts(1, { num: 30, den: 0 })).toThrow();
    });
  });

  describe('ptsToFrame', () => {
    it('maps 0n to frame 0 for every fps', () => {
      for (const fps of FPS_VALUES) {
        expect(ptsToFrame(0n, fps)).toBe(0);
      }
    });

    it('floor-maps any pts inside frame 0 back to frame 0', () => {
      // 30000/1001 has a 3003-tick frame 0 interval [0, 3003)
      expect(ptsToFrame(3002n, { num: 30000, den: 1001 })).toBe(0);
      expect(ptsToFrame(3003n, { num: 30000, den: 1001 })).toBe(1);
    });

    it('throws for a negative pts', () => {
      expect(() => ptsToFrame(-1n, { num: 30, den: 1 })).toThrow();
    });

    it('throws for an invalid fps rational', () => {
      expect(() => ptsToFrame(0n, { num: 30, den: 0 })).toThrow();
    });
  });

  describe('round-trip identity', () => {
    it('ptsToFrame(frameToPts(n)) === n for n in 0..120 across all fps', () => {
      for (const fps of FPS_VALUES) {
        for (let n = 0; n <= 120; n++) {
          expect(ptsToFrame(frameToPts(n, fps), fps)).toBe(n);
        }
      }
    });
  });
});