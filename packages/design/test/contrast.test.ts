/**
 * WCAG contrast math tests (BF-013) — golden values independently computed
 * with the WCAG 2.x relative-luminance formula
 * (https://www.w3.org/TR/WCAG22/#dfn-relative-luminance) and cross-checked
 * against the shipped Cinema Black text pairs (DESIGN.md §3: WCAG AA
 * contrast minimum on all text).
 */
import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb01, relativeLuminance } from '../src/contrast';
import { designTokens } from '../src/tokens';

describe('relativeLuminance (WCAG 2.x)', () => {
  it('pure black has luminance 0', () => {
    expect(relativeLuminance('#000000')).toBe(0);
  });

  it('pure white has luminance 1', () => {
    expect(relativeLuminance('#FFFFFF')).toBe(1);
  });

  it('matches golden values for the Cinema Black tokens', () => {
    expect(relativeLuminance(designTokens['bf-black'])).toBeCloseTo(0.00303527, 7);
    expect(relativeLuminance(designTokens['bf-surface-1'])).toBeCloseTo(0.00560539, 7);
    expect(relativeLuminance(designTokens['bf-surface-2'])).toBeCloseTo(0.01032982, 7);
    expect(relativeLuminance(designTokens['bf-text-muted'])).toBeCloseTo(0.25415209, 7);
    expect(relativeLuminance(designTokens['bf-white'])).toBeCloseTo(0.95597335, 7);
    expect(relativeLuminance(designTokens['bf-orange'])).toBeCloseTo(0.31568068, 7);
  });

  it('uses the linear branch of the sRGB transfer function below 0.04045', () => {
    // #0A0A0A → 10/255 ≈ 0.0392 ≤ 0.04045, so c/12.92 applies per channel;
    // grayscale channels sum to weight 1, so L = 10/255/12.92 exactly.
    expect(relativeLuminance('#0A0A0A')).toBeCloseTo(10 / 255 / 12.92, 12);
  });

  it('is pure (same input → same output, no state)', () => {
    expect(relativeLuminance('#FF6A00')).toBe(relativeLuminance('#FF6A00'));
  });
});

describe('hexToRgb01', () => {
  it('parses 6-digit hex into 0..1 channels', () => {
    expect(hexToRgb01('#FF6A00')).toEqual({ r: 1, g: 106 / 255, b: 0 });
  });

  it('accepts 8-digit hex and ignores the alpha byte (WCAG contrast is opaque)', () => {
    expect(hexToRgb01('#FF6A0026')).toEqual({ r: 1, g: 106 / 255, b: 0 });
  });

  it('throws RangeError on malformed colors', () => {
    expect(() => hexToRgb01('orange')).toThrow(RangeError);
    expect(() => hexToRgb01('#12345')).toThrow(RangeError);
    expect(() => hexToRgb01('#GGHHII')).toThrow(RangeError);
    expect(() => hexToRgb01('')).toThrow(RangeError);
  });
});

describe('contrastRatio (WCAG 2.x)', () => {
  it('pure black on pure white is exactly 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 10);
  });

  it('is symmetric in argument order', () => {
    expect(contrastRatio('#FF6A00', '#0A0A0A')).toBe(contrastRatio('#0A0A0A', '#FF6A00'));
  });

  it('stays within the WCAG range [1, 21]', () => {
    expect(contrastRatio('#0A0A0A', '#0A0A0A')).toBeGreaterThanOrEqual(1);
    expect(contrastRatio('#0A0A0A', '#0A0A0A')).toBeLessThanOrEqual(21);
  });

  it('matches the golden value for orange on theater black (~6.9:1)', () => {
    expect(contrastRatio(designTokens['bf-orange'], designTokens['bf-black'])).toBeCloseTo(
      6.895047,
      5,
    );
  });
});

describe('AA gate for the shipped text pairs (DESIGN.md §3)', () => {
  it('white on theater black passes 4.5:1', () => {
    expect(contrastRatio(designTokens['bf-white'], designTokens['bf-black'])).toBeCloseTo(18.968007, 5);
    expect(contrastRatio(designTokens['bf-white'], designTokens['bf-black'])).toBeGreaterThanOrEqual(4.5);
  });

  it('muted text on surface-1 passes 4.5:1', () => {
    expect(contrastRatio(designTokens['bf-text-muted'], designTokens['bf-surface-1'])).toBeCloseTo(5.469831, 5);
    expect(contrastRatio(designTokens['bf-text-muted'], designTokens['bf-surface-1'])).toBeGreaterThanOrEqual(4.5);
  });

  it('white on surface-2 passes 4.5:1', () => {
    expect(contrastRatio(designTokens['bf-white'], designTokens['bf-surface-2'])).toBeCloseTo(16.674562, 5);
    expect(contrastRatio(designTokens['bf-white'], designTokens['bf-surface-2'])).toBeGreaterThanOrEqual(4.5);
  });

  it('primary Button pair (black text on orange) passes 4.5:1', () => {
    expect(contrastRatio(designTokens['bf-black'], designTokens['bf-orange'])).toBeCloseTo(6.895047, 5);
    expect(contrastRatio(designTokens['bf-black'], designTokens['bf-orange'])).toBeGreaterThanOrEqual(4.5);
  });

  it('orange on black is accent-only by design rule, though it numerically passes AA', () => {
    // Orange-on-black ≈ 6.9:1 ≥ 4.5 — it *could* carry body text, but
    // DESIGN.md §3 reserves orange for accents (≤ ~5% of any screen: playhead,
    // REC, focus ring, primary buttons). It is therefore documented here as an
    // accent color, never a text color, and the Button primary variant uses
    // black-on-orange (6.9:1) instead of white-on-orange (2.75:1, fails AA).
    expect(contrastRatio(designTokens['bf-orange'], designTokens['bf-black'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(designTokens['bf-white'], designTokens['bf-orange'])).toBeCloseTo(2.750961, 5);
    expect(contrastRatio(designTokens['bf-white'], designTokens['bf-orange'])).toBeLessThan(4.5);
  });
});
