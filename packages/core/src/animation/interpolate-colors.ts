/**
 * `interpolateColors()` — interpolates between color stops. Pure math, no
 * React, no DOM. Mirrors Remotion's `interpolateColors()`: colors are parsed
 * up front (hex, rgb()/rgba(), common named colors), every RGBA channel is
 * interpolated linearly through the input range (including alpha), and the
 * result is an `rgba(r, g, b, a)` string.
 */

import { interpolate } from './interpolate';
import { parseColor } from './parse-color';

/**
 * Rounds a channel for output: RGB to integers, alpha to 3 decimals
 * (dropping trailing zeros via `String()`).
 */
const formatRgba = (r: number, g: number, b: number, a: number): string => {
  const alpha = Math.round(a * 1000) / 1000;
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
};

export const interpolateColors = (
  input: number,
  inputRange: readonly number[],
  outputRange: readonly string[],
): string => {
  const channels = outputRange.map((color) => parseColor(color));
  const interpolateChannel = (index: number): number =>
    interpolate(
      input,
      inputRange,
      channels.map((color) => color[index]),
    );

  return formatRgba(
    interpolateChannel(0),
    interpolateChannel(1),
    interpolateChannel(2),
    interpolateChannel(3),
  );
};
