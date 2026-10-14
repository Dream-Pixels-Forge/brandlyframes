/**
 * Time helpers — convert human durations into frames (BF-401). Pure module —
 * no React, no DOM. All helpers take the composition `fps` explicitly and
 * round deterministically (see each TSDoc for the exact rule).
 */

/**
 * Validates that a duration value is a finite number. Throws a helpful
 * error tagged with `helper` (e.g. `'sec'`).
 */
const assertFiniteDuration = (value: number, helper: 'sec' | 'ms', description: string): void => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${helper}(): ${description} must be a finite number, but got ${String(value)}.`);
  }
};

/** Validates that `fps` is a positive finite number (29.97 is allowed). */
const assertFps = (fps: number, helper: string): void => {
  if (typeof fps !== 'number' || !Number.isFinite(fps) || fps <= 0) {
    throw new Error(`${helper}(): fps must be a positive number, but got ${String(fps)}.`);
  }
};

/**
 * Normalizes IEEE-754 `-0` to `0` so callers never observe a negative zero
 * frame (`Math.round(-0.4)` is `-0`).
 */
const normalizeZero = (frames: number): number => (Object.is(frames, -0) ? 0 : frames);

/**
 * Converts `seconds` to frames at `fps`.
 *
 * Rounding rule: the product `seconds * fps` is rounded to the **nearest**
 * integer frame; exact `.5` ties round **up toward +Infinity** (JavaScript
 * `Math.round`). Negative inputs yield negative frames (pure math,
 * unclamped); `-0` is normalized to `0`.
 */
export const sec = (seconds: number, fps: number): number => {
  assertFiniteDuration(seconds, 'sec', 'seconds');
  assertFps(fps, 'sec');
  return normalizeZero(Math.round(seconds * fps));
};

/**
 * Converts `milliseconds` to frames at `fps`.
 *
 * Rounding rule: identical to `sec()` — `Math.round((milliseconds / 1000) *
 * fps)`, nearest frame, `.5` ties round up toward +Infinity.
 */
export const ms = (milliseconds: number, fps: number): number => {
  assertFiniteDuration(milliseconds, 'ms', 'milliseconds');
  assertFps(fps, 'ms');
  return normalizeZero(Math.round((milliseconds / 1000) * fps));
};

/**
 * Timecode pattern: `HH:MM:SS:FF` — hours are unbounded (long films), while
 * minutes and seconds must stay within `[0, 59]`. The frame field is digits
 * only and range-checked against `fps` separately.
 */
const TIMECODE_PATTERN = /^(\d+):([0-5]?\d):([0-5]?\d):(\d+)$/;

/**
 * Converts a `HH:MM:SS:FF` timecode to frames at `fps`.
 *
 * Rounding rules:
 * - The hours/minutes/seconds portion is multiplied by `fps` and rounded to
 *   the **nearest** frame (exact `.5` ties round up toward +Infinity) — this
 *   also handles fractional fps such as 29.97.
 * - The frame field `FF` is added as-is (it already counts frames, never
 *   seconds) and must satisfy `0 <= FF < round(fps)` — the nominal frame
 *   count per second. For 30 fps the valid fields are `00`–`29`; for 29.97
 *   fps they are `00`–`29` too (NTSC timecode convention).
 * - Hours are unbounded (values above 23 are allowed for long films).
 *
 * Malformed timecodes, out-of-range frame fields and invalid fps throw
 * helpful errors.
 */
export const tc = (timecode: string, fps: number): number => {
  assertFps(fps, 'tc');
  const match = TIMECODE_PATTERN.exec(timecode);
  if (match === null) {
    throw new Error(
      `tc(): "${timecode}" is not a valid HH:MM:SS:FF timecode (minutes and seconds must be 00-59, all fields numeric).`,
    );
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const frameField = Number(match[4]);
  const maxFrameField = Math.round(fps) - 1;
  if (frameField > maxFrameField) {
    throw new Error(
      `tc(): frame field ${match[4]} is out of range for ${fps} fps — valid frame fields are 00-${String(
        maxFrameField,
      ).padStart(2, '0')}.`,
    );
  }
  return Math.round((hours * 3600 + minutes * 60 + seconds) * fps) + frameField;
};
