import { validatePositiveInteger } from './validate-frame-inputs';

/**
 * Pure frame math for `<Series>` — no React, no DOM.
 */

/**
 * Maps child durations to their absolute start offsets: child `i` starts at
 * the sum of the durations of children `0..i-1`. Children are stacked
 * back-to-back — no gaps, no overlap. Throws on any duration that is not a
 * positive integer.
 */
export const computeSeriesStarts = (durations: readonly number[]): number[] => {
  const starts: number[] = [];
  let cursor = 0;
  for (let i = 0; i < durations.length; i++) {
    const duration = durations[i];
    validatePositiveInteger(duration, `computeSeriesStarts: duration at index ${i}`);
    starts.push(cursor);
    cursor += duration;
  }
  return starts;
};

/** Total number of frames a Series spans. Throws on invalid durations. */
export const totalSeriesDuration = (durations: readonly number[]): number => {
  let total = 0;
  for (let i = 0; i < durations.length; i++) {
    const duration = durations[i];
    validatePositiveInteger(duration, `totalSeriesDuration: duration at index ${i}`);
    total += duration;
  }
  return total;
};
