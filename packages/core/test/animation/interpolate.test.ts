import { describe, expect, it } from 'vitest';
import { Easing } from '../../src/animation/easing';
import { interpolate } from '../../src/animation/interpolate';

describe('interpolate — basic mapping', () => {
  it('maps the midpoint linearly', () => {
    expect(interpolate(0.5, [0, 1], [0, 100])).toBe(50);
  });

  it('returns the exact output when input equals a range knot (equal inputs)', () => {
    expect(interpolate(10, [0, 10], [7, 13])).toBe(13);
    expect(interpolate(0, [0, 50, 100], [0, 100, 20])).toBe(0);
  });

  it('interpolates piecewise across multiple segments', () => {
    expect(interpolate(25, [0, 50, 100], [0, 100, 20])).toBe(50);
    expect(interpolate(75, [0, 50, 100], [0, 100, 20])).toBe(60);
  });

  it('at an interior knot takes the left segment (progress 1)', () => {
    expect(interpolate(50, [0, 50, 100], [0, 100, 20])).toBe(100);
  });

  it('handles negative and fractional ranges', () => {
    expect(interpolate(-2.5, [-10, 0], [100, 200])).toBe(175);
  });
});

describe('interpolate — extrapolation', () => {
  it("defaults to 'extend' on both sides", () => {
    expect(interpolate(15, [0, 10], [0, 100])).toBe(150);
    expect(interpolate(-5, [0, 10], [0, 100])).toBe(-50);
  });

  it("'clamp' holds the boundary output on the left", () => {
    expect(interpolate(-5, [0, 10], [0, 100], { extrapolateLeft: 'clamp' })).toBe(0);
  });

  it("'clamp' holds the boundary output on the right", () => {
    expect(interpolate(15, [0, 10], [0, 100], { extrapolateRight: 'clamp' })).toBe(100);
  });

  it("'clamp' on both sides leaves in-range values untouched", () => {
    expect(interpolate(5, [0, 10], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })).toBe(50);
  });

  it("'identity' returns the input itself outside the range", () => {
    expect(interpolate(-5, [0, 10], [0, 100], { extrapolateLeft: 'identity' })).toBe(-5);
    expect(interpolate(15, [0, 10], [0, 100], { extrapolateRight: 'identity' })).toBe(15);
  });

  it("supports mixed modes: clamp left, extend right", () => {
    const options = { extrapolateLeft: 'clamp' as const };
    expect(interpolate(-5, [0, 10], [0, 100], options)).toBe(0);
    expect(interpolate(15, [0, 10], [0, 100], options)).toBe(150);
  });
});

describe('interpolate — easing option', () => {
  it('applies the easing to the progress within a segment', () => {
    expect(interpolate(0.5, [0, 1], [0, 100], { easing: Easing.quad.in })).toBe(25);
    expect(interpolate(0.25, [0, 1], [0, 100], { easing: Easing.cubic.out })).toBe(57.8125);
  });

  it('applies the easing to extrapolated progress when extending', () => {
    expect(interpolate(2, [0, 1], [0, 100], { easing: Easing.quad.in })).toBe(400);
  });

  it('returns the exact boundary when clamping, regardless of easing', () => {
    expect(interpolate(2, [0, 1], [0, 100], { easing: Easing.quad.in, extrapolateRight: 'clamp' })).toBe(100);
  });
});

describe('interpolate — validation', () => {
  it('throws for a non-number input', () => {
    expect(() => interpolate('5' as unknown as number, [0, 1], [0, 100])).toThrow(/input/);
    expect(() => interpolate(null as unknown as number, [0, 1], [0, 100])).toThrow(/object \(null\)/);
  });

  it('throws for NaN / Infinity input', () => {
    expect(() => interpolate(NaN, [0, 1], [0, 100])).toThrow(/finite/);
    expect(() => interpolate(Infinity, [0, 1], [0, 100])).toThrow(/finite/);
    expect(() => interpolate(-Infinity, [0, 1], [0, 100])).toThrow(/finite/);
  });

  it('throws for non-finite values in inputRange', () => {
    expect(() => interpolate(0.5, [NaN, 1], [0, 100])).toThrow(/finite/);
    expect(() => interpolate(0.5, [0, Infinity], [0, 100])).toThrow(/finite/);
  });

  it('throws for non-finite values in outputRange', () => {
    expect(() => interpolate(0.5, [0, 1], [0, NaN])).toThrow(/finite/);
  });

  it('throws when inputRange and outputRange have different lengths', () => {
    expect(() => interpolate(0.5, [0, 1], [0, 100, 200])).toThrow(/same length/);
  });

  it('throws for single-point ranges (fewer than 2 elements)', () => {
    expect(() => interpolate(0.5, [1], [0, 100])).toThrow(/at least 2/);
    expect(() => interpolate(0.5, [0, 1], [7])).toThrow(/at least 2/);
    expect(() => interpolate(0.5, [], [])).toThrow(/at least 2/);
  });

  it('throws for a reversed (strictly decreasing) inputRange', () => {
    expect(() => interpolate(5, [10, 0], [0, 100])).toThrow(/monotonically increasing/);
  });

  it('throws for duplicate consecutive input values', () => {
    expect(() => interpolate(0.5, [0, 0.5, 0.5, 1], [0, 25, 75, 100])).toThrow(/monotonically increasing/);
  });

  it('throws for non-array ranges', () => {
    expect(() => interpolate(0.5, '01' as unknown as number[], [0, 100])).toThrow(/array/);
    expect(() => interpolate(0.5, [0, 1], '0100' as unknown as number[])).toThrow(/array/);
  });

  it('throws for an unknown extrapolate mode', () => {
    expect(() =>
      interpolate(15, [0, 10], [0, 100], { extrapolateLeft: 'banana' as 'extend' }),
    ).toThrow(/extrapolateLeft/);
    expect(() =>
      interpolate(15, [0, 10], [0, 100], { extrapolateRight: 'banana' as 'extend' }),
    ).toThrow(/extrapolateRight/);
  });

  it('throws when easing is not a function', () => {
    expect(() =>
      interpolate(0.5, [0, 1], [0, 100], { easing: 'linear' as unknown as () => number }),
    ).toThrow(/easing/);
  });
});
