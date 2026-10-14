import { describe, expect, it } from 'vitest';
import { parseColor } from '../../src/animation/parse-color';

describe('parseColor — hex', () => {
  it('parses 6-digit hex', () => {
    expect(parseColor('#ff0000')).toEqual([255, 0, 0, 1]);
    expect(parseColor('#3c78d8')).toEqual([60, 120, 216, 1]);
  });

  it('parses 3-digit shorthand by expanding digits', () => {
    expect(parseColor('#f00')).toEqual([255, 0, 0, 1]);
    expect(parseColor('#abc')).toEqual([170, 187, 204, 1]);
  });

  it('parses 8-digit hex with alpha', () => {
    expect(parseColor('#ff000080')).toEqual([255, 0, 0, 128 / 255]);
  });

  it('parses 4-digit shorthand with alpha (each digit expands)', () => {
    expect(parseColor('#f00d')).toEqual([255, 0, 0, 221 / 255]);
  });

  it('accepts hex without the leading #', () => {
    expect(parseColor('ff0000')).toEqual([255, 0, 0, 1]);
    expect(parseColor('f00')).toEqual([255, 0, 0, 1]);
  });

  it('is case-insensitive for hex digits', () => {
    expect(parseColor('#FF8000')).toEqual([255, 128, 0, 1]);
    expect(parseColor('#Ff8000')).toEqual([255, 128, 0, 1]);
  });
});

describe('parseColor — rgb()/rgba() functions', () => {
  it('parses comma-separated rgb()', () => {
    expect(parseColor('rgb(255, 0, 0)')).toEqual([255, 0, 0, 1]);
    expect(parseColor('rgb(60,120,216)')).toEqual([60, 120, 216, 1]);
  });

  it('parses comma-separated rgba() with fractional alpha', () => {
    expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual([255, 0, 0, 0.5]);
  });

  it('parses space-separated rgb() (modern CSS syntax)', () => {
    expect(parseColor('rgb(255 0 0)')).toEqual([255, 0, 0, 1]);
  });

  it('parses slash-separated alpha (modern CSS syntax)', () => {
    expect(parseColor('rgba(255 0 0 / 0.5)')).toEqual([255, 0, 0, 0.5]);
  });

  it('accepts fractional channels', () => {
    expect(parseColor('rgb(127.5, 10.25, 0)')).toEqual([127.5, 10.25, 0, 1]);
  });
});

describe('parseColor — named colors', () => {
  it('parses the common CSS keyword set', () => {
    expect(parseColor('red')).toEqual([255, 0, 0, 1]);
    expect(parseColor('black')).toEqual([0, 0, 0, 1]);
    expect(parseColor('white')).toEqual([255, 255, 255, 1]);
    expect(parseColor('rebeccapurple')).toEqual([102, 51, 153, 1]);
    expect(parseColor('navy')).toEqual([0, 0, 128, 1]);
  });

  it('parses `transparent` as rgba(0, 0, 0, 0)', () => {
    expect(parseColor('transparent')).toEqual([0, 0, 0, 0]);
  });

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(parseColor('RED')).toEqual([255, 0, 0, 1]);
    expect(parseColor('  Teal  ')).toEqual([0, 128, 128, 1]);
  });

  it('includes the grey/gray aliases', () => {
    expect(parseColor('grey')).toEqual([128, 128, 128, 1]);
    expect(parseColor('dimgray')).toEqual(parseColor('dimgrey'));
  });
});

describe('parseColor — validation', () => {
  it('throws for an unknown color string, naming the value', () => {
    expect(() => parseColor('not-a-color')).toThrow(/not-a-color/);
  });

  it('throws for unsupported function syntax like hsl()', () => {
    expect(() => parseColor('hsl(0, 100%, 50%)')).toThrow(/hsl\(0, 100%, 50%\)/);
  });

  it('throws for out-of-range channels', () => {
    expect(() => parseColor('rgb(300, 0, 0)')).toThrow(/channel/);
    expect(() => parseColor('rgb(-5, 0, 0)')).toThrow(/channel/);
  });

  it('throws for out-of-range alpha', () => {
    expect(() => parseColor('rgba(0, 0, 0, 2)')).toThrow(/alpha/);
    expect(() => parseColor('rgba(0, 0, 0, -0.1)')).toThrow(/alpha/);
  });

  it('throws for wrong component counts', () => {
    expect(() => parseColor('rgb(1, 2)')).toThrow(/rgb\(/);
    expect(() => parseColor('rgba(1, 2, 3, 0.5, 9)')).toThrow(/rgb\(/);
  });

  it('throws for non-numeric rgb() channels', () => {
    expect(() => parseColor('rgb(nan, 0, 0)')).toThrow();
  });

  it('throws for hex strings of unsupported length (e.g. 5 digits)', () => {
    expect(() => parseColor('abcde')).toThrow(/abcde/);
  });

  it('throws for empty and garbage strings', () => {
    expect(() => parseColor('')).toThrow();
    expect(() => parseColor('####')).toThrow();
  });

  it('throws for non-string input', () => {
    expect(() => parseColor(123 as unknown as string)).toThrow(/string/);
  });
});
