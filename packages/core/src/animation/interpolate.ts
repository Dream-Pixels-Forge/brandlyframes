/**
 * `interpolate()` — maps an input value through a piecewise-linear range
 * pair with easing and extrapolation control. Pure math, no React, no DOM.
 * Mirrors Remotion's `interpolate()` semantics so animations port 1:1.
 */

import type { EasingFunction } from './easing';
import { Easing } from './easing';

export type ExtrapolateType = 'extend' | 'clamp' | 'identity';

export interface InterpolateOptions {
  /** Curve applied to the per-segment progress. Defaults to `Easing.linear`. */
  easing?: EasingFunction;
  /** Behavior when input is below inputRange[0]. Defaults to 'extend'. */
  extrapolateLeft?: ExtrapolateType;
  /** Behavior when input is above the last inputRange point. Defaults to 'extend'. */
  extrapolateRight?: ExtrapolateType;
}

const EXTRAPOLATE_TYPES: readonly ExtrapolateType[] = ['extend', 'clamp', 'identity'];

/**
 * Renders an invalid value for validation error messages (same formatting
 * philosophy as the timeline validators).
 */
const formatInvalidValue = (value: unknown): string => {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  return `${typeof value} (${String(value)})`;
};

const validateRange = (range: readonly number[], name: 'inputRange' | 'outputRange'): void => {
  if (!Array.isArray(range)) {
    throw new Error(`${name} must be an array of numbers, but got ${formatInvalidValue(range)}.`);
  }
  for (const value of range) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`${name} must only contain finite numbers, but got ${formatInvalidValue(value)}.`);
    }
  }
};

/**
 * Shared range validation for `interpolate` and `interpolateColors`:
 * arrays of equal length (>= 2, so a segment to interpolate in always
 * exists), input range strictly monotonically increasing (a duplicate or
 * reversed value would make the segment progress undefined).
 */
const validateRangePair = (inputRange: readonly number[], outputRange: readonly number[]): void => {
  validateRange(inputRange, 'inputRange');
  validateRange(outputRange, 'outputRange');
  if (inputRange.length < 2 || outputRange.length < 2) {
    throw new Error('inputRange and outputRange must have at least 2 elements.');
  }
  if (inputRange.length !== outputRange.length) {
    throw new Error(
      `inputRange (${inputRange.length}) and outputRange (${outputRange.length}) must have the same length.`,
    );
  }
  for (let i = 1; i < inputRange.length; i++) {
    if (inputRange[i] <= inputRange[i - 1]) {
      throw new Error(
        `inputRange must be monotonically increasing, but got [${inputRange.join(', ')}].`,
      );
    }
  }
};

export const interpolate = (
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options: InterpolateOptions = {},
): number => {
  const { easing = Easing.linear, extrapolateLeft = 'extend', extrapolateRight = 'extend' } = options;

  if (typeof input !== 'number' || !Number.isFinite(input)) {
    throw new Error(`input must be a finite number, but got ${formatInvalidValue(input)}.`);
  }
  if (typeof easing !== 'function') {
    throw new Error(`easing must be a function, but got ${formatInvalidValue(easing)}.`);
  }
  if (!EXTRAPOLATE_TYPES.includes(extrapolateLeft)) {
    throw new Error(
      `extrapolateLeft must be one of ${EXTRAPOLATE_TYPES.join(', ')}, but got ${formatInvalidValue(extrapolateLeft)}.`,
    );
  }
  if (!EXTRAPOLATE_TYPES.includes(extrapolateRight)) {
    throw new Error(
      `extrapolateRight must be one of ${EXTRAPOLATE_TYPES.join(', ')}, but got ${formatInvalidValue(extrapolateRight)}.`,
    );
  }
  validateRangePair(inputRange, outputRange);

  const lastIndex = inputRange.length - 1;

  if (input < inputRange[0]) {
    if (extrapolateLeft === 'identity') return input;
    if (extrapolateLeft === 'clamp') return outputRange[0];
  } else if (input > inputRange[lastIndex]) {
    if (extrapolateRight === 'identity') return input;
    if (extrapolateRight === 'clamp') return outputRange[lastIndex];
  }

  // Earliest segment containing the input: at a knot the left segment's
  // progress is exactly 1, so knot values are exact regardless of easing.
  // The loop never leaves the last segment, so 'extend' extrapolates with
  // progress > 1 (or < 0) instead of indexing past the range.
  let segment = 0;
  while (segment < lastIndex - 1 && input > inputRange[segment + 1]) {
    segment++;
  }

  const progress = (input - inputRange[segment]) / (inputRange[segment + 1] - inputRange[segment]);
  const eased = easing(progress);
  return outputRange[segment] + (outputRange[segment + 1] - outputRange[segment]) * eased;
};
