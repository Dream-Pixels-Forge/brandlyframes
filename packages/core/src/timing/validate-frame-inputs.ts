import type { VideoConfig } from '../context/frame-context';

/**
 * Renders an invalid value for inclusion in a validation error message.
 * Exported so every timing error formats values the same way.
 */
export const formatInvalidValue = (value: unknown): string => {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  return `${typeof value} (${String(value)})`;
};

/**
 * Validates that a value is a whole finite number (negative allowed — e.g.
 * `<Sequence from={-5}>`). Throws a helpful error tagged with `description`.
 */
export const validateFrame = (value: number, description: string): void => {
  if (!Number.isInteger(value)) {
    throw new Error(`${description} must be an integer, but got ${formatInvalidValue(value)}.`);
  }
};

/**
 * Validates that a value is a whole finite number > 0 (durations, times, …).
 * Throws a helpful error tagged with `description`.
 */
export const validatePositiveInteger = (value: number, description: string): void => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${description} must be a positive integer, but got ${formatInvalidValue(value)}.`);
  }
};

/**
 * Validates a frame-scoper layout prop. Throws a helpful error tagged with
 * `description` (e.g. `'<Sequence>'`).
 */
export const validateLayout = (layout: unknown, description: string): void => {
  if (layout !== 'absolute-fill' && layout !== 'none') {
    throw new Error(
      `${description} layout must be either 'absolute-fill' or 'none', but got ${formatInvalidValue(layout)}.`,
    );
  }
};

/**
 * Validates the video config carried by the frame context: `fps` must be a
 * positive finite number (fractional fps such as 29.97 is allowed);
 * `width`, `height` and `durationInFrames` must be positive integers.
 */
export const validateVideoConfig = (config: VideoConfig): void => {
  if (typeof config !== 'object' || config === null) {
    throw new Error(`Invalid video config: expected an object, but got ${formatInvalidValue(config)}.`);
  }
  if (typeof config.fps !== 'number' || !Number.isFinite(config.fps) || config.fps <= 0) {
    throw new Error(`Invalid video config: fps must be a positive number, but got ${formatInvalidValue(config.fps)}.`);
  }
  validatePositiveInteger(config.width, 'Invalid video config: width');
  validatePositiveInteger(config.height, 'Invalid video config: height');
  validatePositiveInteger(config.durationInFrames, 'Invalid video config: durationInFrames');
};
