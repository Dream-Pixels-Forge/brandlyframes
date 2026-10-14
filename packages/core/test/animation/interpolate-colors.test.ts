import { describe, expect, it } from 'vitest';
import { interpolateColors } from '../../src/animation/interpolate-colors';

describe('interpolateColors — midpoint exactness', () => {
  it('black → white at the midpoint is exactly rgb(128, 128, 128)', () => {
    expect(interpolateColors(0.5, [0, 1], ['#000000', '#ffffff'])).toBe('rgba(128, 128, 128, 1)');
  });

  it('red → blue at the midpoint mixes both channels', () => {
    expect(interpolateColors(0.5, [0, 1], ['#ff0000', '#0000ff'])).toBe('rgba(128, 0, 128, 1)');
  });

  it('interpolates each channel independently', () => {
    expect(interpolateColors(0.25, [0, 1], ['#000000', '#ffffff'])).toBe('rgba(64, 64, 64, 1)');
  });
});

describe('interpolateColors — alpha handling', () => {
  it('interpolates alpha between fully transparent and opaque', () => {
    expect(interpolateColors(0.5, [0, 1], ['rgba(255, 0, 0, 0)', 'rgba(255, 0, 0, 1)'])).toBe(
      'rgba(255, 0, 0, 0.5)',
    );
  });

  it('interpolates both color and alpha together', () => {
    expect(interpolateColors(0.5, [0, 1], ['rgba(0, 0, 0, 0)', 'rgba(255, 255, 255, 1)'])).toBe(
      'rgba(128, 128, 128, 0.5)',
    );
  });

  it('reads alpha from 8-digit hex and interpolates it', () => {
    expect(interpolateColors(0.5, [0, 1], ['#00000000', '#00000080'])).toBe('rgba(0, 0, 0, 0.251)');
  });

  it('keeps a constant alpha when both stops are opaque', () => {
    expect(interpolateColors(0.5, [0, 1], ['red', 'blue'])).toBe('rgba(128, 0, 128, 1)');
  });
});

describe('interpolateColors — accepted formats', () => {
  it('supports hex shorthand', () => {
    expect(interpolateColors(0.5, [0, 1], ['#f00', '#00f'])).toBe('rgba(128, 0, 128, 1)');
  });

  it('supports rgb() function syntax', () => {
    expect(interpolateColors(0.5, [0, 1], ['rgb(255, 0, 0)', 'rgb(0, 0, 255)'])).toBe('rgba(128, 0, 128, 1)');
  });

  it('supports common named colors, case-insensitively', () => {
    expect(interpolateColors(0.5, [0, 1], ['RED', 'blue'])).toBe('rgba(128, 0, 128, 1)');
    expect(interpolateColors(0.5, [0, 1], ['white', 'black'])).toBe('rgba(128, 128, 128, 1)');
  });

  it('treats `transparent` as rgba(0, 0, 0, 0)', () => {
    expect(interpolateColors(1, [0, 1], ['black', 'transparent'])).toBe('rgba(0, 0, 0, 0)');
  });

  it('accepts mixed formats across stops', () => {
    expect(interpolateColors(0.5, [0, 1], ['red', 'rgb(0, 0, 255)'])).toBe('rgba(128, 0, 128, 1)');
  });

  it('is case-insensitive for hex digits', () => {
    expect(interpolateColors(0, [0, 1], ['#FF8000', '#00FF80'])).toBe('rgba(255, 128, 0, 1)');
  });
});

describe('interpolateColors — piecewise and extrapolation', () => {
  it('supports three-stop piecewise interpolation', () => {
    expect(interpolateColors(1, [0, 1, 2], ['black', 'white', 'black'])).toBe('rgba(255, 255, 255, 1)');
    expect(interpolateColors(1.5, [0, 1, 2], ['black', 'white', 'black'])).toBe('rgba(128, 128, 128, 1)');
  });

  it("extrapolates channels beyond the range (default 'extend', like Remotion)", () => {
    expect(interpolateColors(2, [0, 1], ['#000000', '#ffffff'])).toBe('rgba(510, 510, 510, 1)');
  });
});

describe('interpolateColors — validation', () => {
  it('throws for mismatched range lengths', () => {
    expect(() => interpolateColors(0.5, [0, 1], ['red', 'blue', 'green'])).toThrow(/same length/);
  });

  it('throws for a reversed input range', () => {
    expect(() => interpolateColors(0.5, [1, 0], ['red', 'blue'])).toThrow(/monotonically increasing/);
  });

  it('throws for an unparseable color', () => {
    expect(() => interpolateColors(0.5, [0, 1], ['red', 'not-a-color'])).toThrow(/not-a-color/);
  });

  it('throws for non-finite input', () => {
    expect(() => interpolateColors(NaN, [0, 1], ['red', 'blue'])).toThrow(/finite/);
  });
});
