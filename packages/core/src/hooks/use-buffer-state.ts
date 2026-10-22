/**
 * `useBufferState` — reports whether a media element is currently buffering
 * and how much of it is buffered, driven by the composition frame clock.
 *
 * The pure computation (`computeBufferState`) is free of React/DOM and is
 * safe in render workers and Node. The hook subscribes to a media element's
 * `progress`/`waiting`/`playing` events so the state stays current as the
 * element downloads data. Returns a non-buffering state when no element is
 * provided (SSR / render workers), so compositions stay deterministic.
 */

import { useCallback, useEffect, useState } from 'react';

/** One contiguous buffered time range, in seconds. */
export type BufferedRange = {
  /** Start of the range, in seconds. */
  readonly start: number;
  /** End of the range (exclusive), in seconds. */
  readonly end: number;
};

/** The buffering state of a media element at the current frame. */
export type BufferState = {
  /** True when the element is waiting for data or the playhead sits outside every buffered range. */
  readonly isBuffering: boolean;
  /** All buffered ranges, as reported by the element. */
  readonly ranges: readonly BufferedRange[];
  /** Total buffered duration in seconds (sum of range lengths). */
  readonly bufferedSeconds: number;
};

/** Empty TimeRanges-equivalent for elements that provide no buffer info. */
const EMPTY_RANGES: readonly BufferedRange[] = [];

/**
 * Pure computation of the buffer state. No React, no DOM — deterministic for
 * the same inputs and safe anywhere.
 *
 * `isBuffering` is true when the element is waiting for data (`isWaiting`)
 * or when the playhead (`currentTime`) falls outside every buffered range.
 */
export const computeBufferState = ({
  ranges,
  currentTime,
  isWaiting,
}: {
  /** Buffered ranges, in seconds. */
  readonly ranges: readonly BufferedRange[];
  /** Current playback position, in seconds. */
  readonly currentTime: number;
  /** Whether the element is currently waiting/stalled for data. */
  readonly isWaiting: boolean;
}): BufferState => {
  const coversCurrent = ranges.some(
    (range) => range.start <= currentTime && currentTime <= range.end,
  );
  const bufferedSeconds = ranges.reduce(
    (sum, range) => sum + Math.max(0, range.end - range.start),
    0,
  );
  return {
    isBuffering: isWaiting || !coversCurrent,
    ranges,
    bufferedSeconds,
  };
};

/**
 * A minimal media-element surface: buffered ranges, playhead/duration, and
 * the event subscription used by {@link useBufferState}. Real
 * `HTMLMediaElement` objects satisfy this structurally, so the hook works
 * with `<video>`/`<audio>` elements and with fakes in tests.
 */
export type MediaElementLike = {
  /** Buffered time ranges, as reported by the element. */
  readonly buffered: TimeRanges;
  /** Current playback position, in seconds. */
  readonly currentTime: number;
  /** Media duration, in seconds. */
  readonly duration: number;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
};

/**
 * Reads a media element's buffered ranges and playhead into a plain object.
 */
const readElementState = (
  mediaElement: MediaElementLike,
): {
  ranges: BufferedRange[];
  currentTime: number;
  duration: number;
} => {
  const ranges: BufferedRange[] = [];
  for (let i = 0; i < mediaElement.buffered.length; i++) {
    ranges.push({ start: mediaElement.buffered.start(i), end: mediaElement.buffered.end(i) });
  }
  return { ranges, currentTime: mediaElement.currentTime, duration: mediaElement.duration };
};

/** Initial (non-buffering) state used when there is no media element. */
const emptyState: BufferState = { isBuffering: false, ranges: EMPTY_RANGES, bufferedSeconds: 0 };

/**
 * Returns the buffering state of `mediaElement`, recomputed whenever the
 * element emits `progress`, `waiting` or `playing`. Returns `emptyState`
 * when `mediaElement` is `null` (no DOM / render worker).
 */
export const useBufferState = (
  mediaElement: MediaElementLike | null,
): BufferState => {
  const [isWaiting, setIsWaiting] = useState(false);
  const [state, setState] = useState<BufferState>(() =>
    mediaElement
      ? computeBufferState({
          ...readElementState(mediaElement),
          isWaiting: false,
        })
      : emptyState,
  );

  const onProgress = useCallback(() => {
    if (!mediaElement) return;
    setState(computeBufferState({ ...readElementState(mediaElement), isWaiting }));
  }, [mediaElement, isWaiting]);

  const onWaiting = useCallback(() => {
    setIsWaiting(true);
    if (!mediaElement) return;
    setState(computeBufferState({ ...readElementState(mediaElement), isWaiting: true }));
  }, [mediaElement]);

  const onPlaying = useCallback(() => {
    setIsWaiting(false);
    if (!mediaElement) return;
    setState(computeBufferState({ ...readElementState(mediaElement), isWaiting: false }));
  }, [mediaElement]);

  useEffect(() => {
    if (!mediaElement) return undefined;
    mediaElement.addEventListener('progress', onProgress);
    mediaElement.addEventListener('waiting', onWaiting);
    mediaElement.addEventListener('playing', onPlaying);
    return () => {
      mediaElement.removeEventListener('progress', onProgress);
      mediaElement.removeEventListener('waiting', onWaiting);
      mediaElement.removeEventListener('playing', onPlaying);
    };
  }, [mediaElement, onProgress, onWaiting, onPlaying]);

  return state;
};
