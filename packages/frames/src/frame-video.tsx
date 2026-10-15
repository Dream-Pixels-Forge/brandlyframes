/**
 * <FrameVideo> — trim, playbackRate, reverse, freeze, ping-pong [BF-054].
 *
 * `mapFrameVideoIndex` is the pure index-mapping core; `<FrameVideo>` is a
 * thin deterministic renderer over it.
 *
 * Clean-room implementation. Dependency-free of sibling packages.
 */

import type { ReactElement } from 'react';
import { jsx } from 'react/jsx-runtime';

/**
 * Playback options for {@link mapFrameVideoIndex} and {@link FrameVideo}.
 */
export interface FrameVideoOptions {
  /**
   * Half-open source window `[from, to)` intersected with `[0, length)`.
   * Defaults to the full `[0, length)` window.
   */
  trim?: [number, number];
  /**
   * Speed multiplier. `2` shows every other source frame, `0.5` repeats
   * each source frame twice. Fractional values are allowed; the semantic
   * is exactly `floor(n * playbackRate)`.
   */
  playbackRate?: number;
  /** Play the window backwards. Ignored when `pingPong` is `true`. */
  reverse?: boolean;
  /** Hold a single source frame (`null` = no freeze). Clamped to window. */
  freeze?: number | null;
  /**
   * Bounce back and forth across the window. When `true`, `reverse` is
   * ignored.
   */
  pingPong?: boolean;
}

/**
 * Maps composition frame `n` to a source frame index [BF-054].
 *
 * Window: `[from, to)` (from `trim`, default `[0, length)`) intersected
 * with `[0, length)`; the intersected length `L` must be >= 1.
 *
 * - `freeze != null` → `clamp(freeze, from, to - 1)`.
 * - `p = floor(n * playbackRate)` (default rate `1`).
 * - `pingPong` → triangle wave over the window (`reverse` ignored);
 *   `L == 1` returns `from`.
 * - `reverse` → `from + (L - 1 - min(p, L - 1))`.
 * - default → `from + min(p, L - 1)` (clamps at the window end, never blank).
 *
 * @param n - composition frame index (non-negative integer)
 * @param length - source frame count (positive integer)
 * @param options - playback options (see {@link FrameVideoOptions})
 * @returns source frame index within the window
 * @throws {Error} on invalid `n`, `length`, `trim`, `playbackRate`,
 *   `freeze`, or when the intersected window is empty
 */
export const mapFrameVideoIndex = (
  n: number,
  length: number,
  options?: FrameVideoOptions,
): number => {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error(`n must be a non-negative integer, got ${n}`);
  }
  if (!Number.isSafeInteger(length) || length < 1) {
    throw new Error(`length must be a positive integer, got ${length}`);
  }
  const { trim, playbackRate = 1, reverse = false, freeze = null, pingPong = false } =
    options ?? {};
  let from = 0;
  let to = length;
  if (trim !== undefined) {
    const [trimFrom, trimTo] = trim;
    if (
      !Number.isSafeInteger(trimFrom) ||
      !Number.isSafeInteger(trimTo) ||
      trimFrom < 0 ||
      trimTo <= trimFrom
    ) {
      throw new Error(
        `trim must be integers with 0 <= from < to, got [${String(trimFrom)}, ${String(trimTo)}]`,
      );
    }
    from = trimFrom;
    to = trimTo;
  }
  if (
    typeof playbackRate !== 'number' ||
    !Number.isFinite(playbackRate) ||
    playbackRate <= 0
  ) {
    throw new Error(`playbackRate must be a finite number > 0, got ${String(playbackRate)}`);
  }
  if (freeze !== null && (!Number.isSafeInteger(freeze) || freeze < 0)) {
    throw new Error(
      `freeze must be null or a non-negative integer, got ${String(freeze)}`,
    );
  }
  const winFrom = Math.max(from, 0);
  const winTo = Math.min(to, length);
  const L = winTo - winFrom;
  if (L < 1) {
    throw new Error(
      `trim window [${from}, ${to}) intersected with [0, ${length}) is empty`,
    );
  }
  if (freeze !== null) {
    return Math.min(Math.max(freeze, winFrom), winTo - 1);
  }
  const p = Math.floor(n * playbackRate);
  if (pingPong === true) {
    if (L === 1) {
      return winFrom;
    }
    const cycle = 2 * (L - 1);
    const m = p % cycle;
    const i = m <= L - 1 ? m : cycle - m;
    return winFrom + i;
  }
  const clamped = Math.min(p, L - 1);
  if (reverse === true) {
    return winFrom + (L - 1 - clamped);
  }
  return winFrom + clamped;
};

/**
 * Props for {@link FrameVideo}.
 *
 * `frame` is an explicit prop: the Studio/player passes
 * `useCurrentFrame()`. This keeps `packages/frames` dependency-free of
 * sibling packages.
 */
export interface FrameVideoProps extends FrameVideoOptions {
  /** Source identifier (e.g. clip URL or id). */
  src: string;
  /** Source frame count (positive integer). */
  length: number;
  /** Composition frame index (non-negative integer). */
  frame: number;
}

/**
 * Deterministic frame renderer [BF-054].
 *
 * Resolves `mapped = mapFrameVideoIndex(frame, length, {...})` and renders
 * `<img src={src + '#frame=' + mapped} data-frame={mapped} alt="" />`.
 * Real backends resolve the `#frame=` fragment to the decoded source
 * frame; the fragment is a deterministic addressing convention, not a
 * browser media-fragment feature.
 *
 * @param props - source, length, frame, and playback options
 * @returns img element pinned to the mapped source frame
 */
export const FrameVideo = (props: FrameVideoProps): ReactElement => {
  const { src, length, frame, trim, playbackRate, reverse, freeze, pingPong } =
    props;
  const mapped = mapFrameVideoIndex(frame, length, {
    trim,
    playbackRate,
    reverse,
    freeze,
    pingPong,
  });
  return jsx('img', {
    src: `${src}#frame=${mapped}`,
    'data-frame': mapped,
    alt: '',
  });
};
