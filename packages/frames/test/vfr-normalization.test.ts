import { describe, it, expect } from 'vitest';
import {
  buildPtsTable,
  ptsTableLookup,
  normalizeToCfr,
  frameToPts,
  PTS_DENOMINATOR,
  type Rational,
} from '../src/index';

/**
 * VFR normalization via PTS table [BF-056].
 *
 * A {@link PtsTable} pins each source frame to an exact presentation
 * timestamp on a 90 kHz timescale. `normalizeToCfr` resamples a VFR
 * source onto a constant-frame-rate timeline: destination frame `j`
 * displays the source frame whose PTS is closest to `j`'s nominal PTS,
 * with exact BigInt rational math throughout (no float drift) and
 * half-up ties broken toward the LATER source frame.
 */
const FPS_30: Rational = { num: 30, den: 1 };
const NTSC_30: Rational = { num: 30000, den: 1001 };
const NTSC_60: Rational = { num: 60000, den: 1001 };

describe('VFR normalization [BF-056]', () => {
  describe('buildPtsTable', () => {
    it('accepts bigint and number mixes', () => {
      const table = buildPtsTable([0, 3000n, 6000]);
      expect(table.pts).toEqual([0n, 3000n, 6000n]);
      expect(table.timescale).toBe(PTS_DENOMINATOR);
    });

    it('rejects an empty timestamp list', () => {
      expect(() => buildPtsTable([])).toThrow();
    });

    it('rejects non-increasing sequences (equal or decreasing)', () => {
      expect(() => buildPtsTable([0, 3000, 3000])).toThrow();
      expect(() => buildPtsTable([0n, 5000n, 3000n])).toThrow();
    });

    it('rejects negative timestamps', () => {
      expect(() => buildPtsTable([-1, 100])).toThrow();
      expect(() => buildPtsTable([-5n])).toThrow();
    });
  });

  describe('ptsTableLookup', () => {
    const table = buildPtsTable([0, 3000, 9000, 12000]);

    it('returns the exact pts for in-range frames', () => {
      expect(ptsTableLookup(table, 0)).toBe(0n);
      expect(ptsTableLookup(table, 2)).toBe(9000n);
      expect(ptsTableLookup(table, 3)).toBe(12000n);
    });

    it('clamps out-of-range frames to the nearest endpoint', () => {
      expect(ptsTableLookup(table, -1)).toBe(0n);
      expect(ptsTableLookup(table, -100)).toBe(0n);
      expect(ptsTableLookup(table, 4)).toBe(12000n);
      expect(ptsTableLookup(table, 99)).toBe(12000n);
    });

    it('throws for non-integer frames', () => {
      expect(() => ptsTableLookup(table, 1.5)).toThrow();
      expect(() => ptsTableLookup(table, NaN)).toThrow();
    });
  });

  describe('normalizeToCfr', () => {
    it('maps a constant-30fps source to the identity map at 30/1', () => {
      const source = Array.from({ length: 10 }, (_, i) => i * 3000);
      const table = buildPtsTable(source);
      const { frame } = normalizeToCfr(table, FPS_30);
      // ptsLast = 27000 ticks, so J = ceil(27000 * 30 / 90000) = 9, and
      // nominal_j = j * 3000 lands exactly on pts[j] for every j.
      expect(frame).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('maps the doubled-interval VFR fixture [0,3000,9000,12000] to [0,1,2,2] at 30fps', () => {
      // Hand computation on the 90 kHz timescale, target 30/1, nominal_j = j * 3000:
      // j=0: nominal 0 -> exact hit on pts[0] -> 0.
      // j=1: nominal 3000 -> exact hit on pts[1] -> 1.
      // j=2: nominal 6000 -> equidistant (3000 ticks) from pts[1]=3000 and
      //      pts[2]=9000; the half-up tie-break picks the LATER frame -> 2.
      // j=3: nominal 9000 -> exact hit on pts[2] -> 2.
      // J = ceil(12000 * 30 / 90000) = ceil(4) = 4 destination frames.
      const table = buildPtsTable([0, 3000, 9000, 12000]);
      const { frame } = normalizeToCfr(table, FPS_30);
      expect(frame).toEqual([0, 1, 2, 2]);
    });

    it('maps a 60-frame 30000/1001 source to ceil(j/2) at 60000/1001', () => {
      // Fixture built with the package's own frameToPts: pts[i] = i * 3003
      // (3003 ticks/frame is integral for 30000/1001, so ceiling is exact).
      // ptsLast = 59 * 3003 = 177177, so
      // J = ceil(177177 * 60000 / (1001 * 90000)) = exactly 118.
      // nominal_j = j * 1501.5 ticks: even j = 2k hits pts[k] exactly -> k;
      // odd j = 2k+1 sits exactly halfway between pts[k] and pts[k+1], so
      // the half-up tie-break picks the later frame -> k+1.
      // Hence map[j] = ceil(j/2): each destination frame corresponds to the
      // source frame whose half-open interval contains its nominal time.
      const source = Array.from({ length: 60 }, (_, i) => frameToPts(i, NTSC_30));
      const table = buildPtsTable(source);
      const { frame } = normalizeToCfr(table, NTSC_60);
      expect(frame).toHaveLength(118);
      expect(frame).toEqual(Array.from({ length: 118 }, (_, j) => Math.ceil(j / 2)));
    });
  });
});
