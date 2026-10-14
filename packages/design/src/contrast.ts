/**
 * WCAG 2.x contrast math (BF-013) — pure functions with no React, DOM or
 * wall-clock dependency. `test/contrast.test.ts` gates the shipped Cinema
 * Black text pairs at the AA minimum (DESIGN.md §3) and consumers can use
 * the same functions for their own token checks.
 *
 * Reference: https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 */

/** An opaque sRGB color resolved into 0..1 channel values. */
export interface Rgb01 {
  /** Red channel, 0..1. */
  r: number;
  /** Green channel, 0..1. */
  g: number;
  /** Blue channel, 0..1. */
  b: number;
}

const HEX_6 = /^#([0-9A-Fa-f]{6})$/;
const HEX_8 = /^#([0-9A-Fa-f]{8})$/;

/**
 * Parses `#RRGGBB` (and `#RRGGBBAA`) hex colors into 0..1 sRGB channels.
 * For 8-digit input the alpha byte is ignored, because WCAG contrast is
 * defined over opaque colors.
 *
 * @throws RangeError when `hex` is not a supported hex color literal.
 */
export function hexToRgb01(hex: string): Rgb01 {
  const match6 = HEX_6.exec(hex);
  const match8 = HEX_8.exec(hex);
  const digits = match6?.[1] ?? match8?.[1].slice(0, 6);
  if (digits === undefined) {
    throw new RangeError(`Invalid hex color: ${JSON.stringify(hex)} (expected #RRGGBB or #RRGGBBAA)`);
  }
  return {
    r: Number.parseInt(digits.slice(0, 2), 16) / 255,
    g: Number.parseInt(digits.slice(2, 4), 16) / 255,
    b: Number.parseInt(digits.slice(4, 6), 16) / 255,
  };
}

/** WCAG sRGB channel linearization: c/12.92 at or below 0.04045, else gamma. */
const linearizeChannel = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

/**
 * WCAG 2.x relative luminance of an opaque sRGB color: linearize each
 * channel, then the 0.2126 R / 0.7152 G / 0.0722 B weighted sum. Result is
 * in [0, 1] — 0 for pure black, 1 for pure white.
 *
 * @throws RangeError when `hex` is not a supported hex color literal.
 */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb01(hex);
  return 0.2126 * linearizeChannel(r) + 0.7152 * linearizeChannel(g) + 0.0722 * linearizeChannel(b);
}

/**
 * WCAG 2.x contrast ratio between two opaque sRGB colors: (L1 + 0.05) /
 * (L2 + 0.05) with L1 the lighter luminance. The result is in [1, 21] — 1
 * for identical colors, 21 for pure black on pure white — and independent of
 * argument order.
 *
 * @throws RangeError when either color is not a supported hex color literal.
 */
export function contrastRatio(foreground: string, background: string): number {
  const lumForeground = relativeLuminance(foreground);
  const lumBackground = relativeLuminance(background);
  const lighter = Math.max(lumForeground, lumBackground);
  const darker = Math.min(lumForeground, lumBackground);
  return (lighter + 0.05) / (darker + 0.05);
}
