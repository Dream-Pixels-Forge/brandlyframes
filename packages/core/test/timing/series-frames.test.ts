import { describe, expect, it } from 'vitest';
import { computeSeriesStarts, totalSeriesDuration } from '../../src/timing/series-frames';

describe('computeSeriesStarts', () => {
  it('returns an empty list for an empty series', () => {
    expect(computeSeriesStarts([])).toEqual([]);
  });

  it('starts the first child at frame 0', () => {
    expect(computeSeriesStarts([10])).toEqual([0]);
  });

  it('stacks children back-to-back with no gaps and no overlap', () => {
    expect(computeSeriesStarts([10, 20, 30])).toEqual([0, 10, 30]);
    expect(computeSeriesStarts([1, 1, 1, 1])).toEqual([0, 1, 2, 3]);
  });

  it('does not mutate its input', () => {
    const durations = [10, 20, 30];
    computeSeriesStarts(durations);
    expect(durations).toEqual([10, 20, 30]);
  });

  it('rejects a zero duration', () => {
    expect(() => computeSeriesStarts([10, 0, 30])).toThrow(/must be a positive integer/);
  });

  it('rejects negative, fractional, NaN and infinite durations', () => {
    expect(() => computeSeriesStarts([-1])).toThrow(/must be a positive integer/);
    expect(() => computeSeriesStarts([1.5])).toThrow(/must be a positive integer/);
    expect(() => computeSeriesStarts([Number.NaN])).toThrow(/must be a positive integer/);
    expect(() => computeSeriesStarts([Number.POSITIVE_INFINITY])).toThrow(/must be a positive integer/);
  });

  it('is deterministic: the same durations always resolve to the same offsets', () => {
    const first = computeSeriesStarts([10, 20, 30]);
    const second = computeSeriesStarts([10, 20, 30]);
    expect(second).toEqual(first);
  });
});

describe('totalSeriesDuration', () => {
  it('sums all child durations', () => {
    expect(totalSeriesDuration([])).toBe(0);
    expect(totalSeriesDuration([10])).toBe(10);
    expect(totalSeriesDuration([10, 20, 30])).toBe(60);
  });

  it('rejects invalid durations', () => {
    expect(() => totalSeriesDuration([10, 0])).toThrow(/must be a positive integer/);
  });

  it('is deterministic', () => {
    expect(totalSeriesDuration([4, 5, 6])).toBe(totalSeriesDuration([4, 5, 6]));
  });
});
