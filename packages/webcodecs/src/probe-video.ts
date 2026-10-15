/**
 * @brandlyframes/webcodecs — video probing with exact-rational fps [BF-050]
 *
 * Clean-room implementation. No real decoding here (that belongs to future
 * VideoDecoder work); this module provides a documented, correctly-typed
 * probing path whose fps is always an exact rational — never a float.
 *
 * Alpha and color-space normalization live in `./color-alpha` ([BF-057]).
 */

import { detectAlphaFromCodec, parseColorSpace } from './color-alpha';
import type { AlphaMode, ColorSpace } from './color-alpha';

/**
 * Rational frame rate, mirroring the `Rational` interface from
 * `@brandlyframes/frames` (`{ num, den }`, `den > 0`).
 *
 * Defined locally so this package has no workspace dependency; the shape is
 * assignment-compatible with `@brandlyframes/frames` `Rational`. No logic is
 * copied — only the two-field shape.
 */
export interface ProbeRational {
  /** Numerator (frames per second numerator). Positive safe integer. */
  num: number;
  /** Denominator (frames per second denominator). Positive safe integer. */
  den: number;
}

/**
 * Minimal structural shape of a video element needed for probing.
 * Satisfied by `HTMLVideoElement` in the browser and by plain mock objects
 * in Node tests.
 */
export interface ProbeableVideoElement {
  /** Media duration in seconds. */
  duration: number;
  /** Intrinsic video width in pixels. */
  videoWidth: number;
  /** Intrinsic video height in pixels. */
  videoHeight: number;
  /**
   * Optional playback-quality readout. When present, a positive
   * `droppedVideoFrames` count marks the stream as variable-frame-rate
   * (heuristic — see {@link probeVideoFallback}).
   */
  getVideoPlaybackQuality?: () => {
    droppedVideoFrames: number;
    totalVideoFrames: number;
  };
}

/**
 * Optional hints the caller may know without decoding.
 */
export interface ProbeSourceInfo {
  /** Codec string, e.g. `'avc1.42E01E'`. Defaults to `''`. */
  codec?: string;
  /**
   * Exact frame count when known from the container. When provided alongside
   * a positive duration, fps is derived exactly as
   * `reduce(frameCountHint / duration)` — no floats.
   */
  frameCountHint?: number;
  /** Color space label, e.g. `'srgb'`. Defaults to `'unknown'`. */
  colorSpace?: string;
  /** Whether the stream carries an alpha channel. Defaults to `false`. */
  hasAlpha?: boolean;
}

/**
 * Probed video summary. `fps` is exact-rational; `frameCount` is an estimate
 * unless the caller supplied `frameCountHint` (see {@link probeVideoFallback}).
 */
export interface ProbedVideo {
  /** Exact rational frame rate, e.g. `{ num: 30000, den: 1001 }` for NTSC. */
  fps: ProbeRational;
  /** Frame count (estimated unless derived from `frameCountHint`). */
  frameCount: number;
  /** Normalized color space (closed {@link ColorSpace} token). */
  colorSpace: ColorSpace;
  /** Whether the stream carries an alpha channel. */
  hasAlpha: boolean;
  /**
   * How alpha is encoded when present; `null` when `hasAlpha` is `false`.
   * Derived from the codec hint via `detectAlphaFromCodec`.
   */
  alphaMode: AlphaMode | null;
  /** Variable-frame-rate heuristic flag. */
  isVFR: boolean;
  /** Codec string, or `''` when unknown. */
  codec: string;
  /** Intrinsic video width in pixels. */
  width: number;
  /** Intrinsic video height in pixels. */
  height: number;
  /** Media duration in seconds. */
  duration: number;
}

/** Default fps used when no exact derivation is possible: 30/1. */
const DEFAULT_FPS: ProbeRational = { num: 30, den: 1 };

/**
 * Greatest common divisor via the Euclidean algorithm (exact integer math).
 *
 * @param a First non-negative integer
 * @param b Second non-negative integer
 * @returns `gcd(a, b)`
 */
const gcd = (a: number, b: number): number => {
  let x = a;
  let y = b;
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
};

/**
 * Reduce a fraction to lowest terms with exact integer math.
 *
 * Degenerate inputs (non-integers, `num < 1`, `den < 1`) fall back to the
 * documented default `{ num: 30, den: 1 }` rather than throwing, so probing
 * never fails on malformed hints.
 *
 * @param num Numerator candidate (must be a positive safe integer)
 * @param den Denominator candidate (must be a positive safe integer)
 * @returns Reduced `{ num, den }` with `den > 0`, or `{ num: 30, den: 1 }`
 */
export const reduceRational = (num: number, den: number): ProbeRational => {
  if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den) || num < 1 || den < 1) {
    return { ...DEFAULT_FPS };
  }
  const divisor = gcd(num, den);
  return { num: num / divisor, den: den / divisor };
};

/**
 * Derive an exact-rational fps from a frame-count hint and a duration.
 *
 * `duration` is a float (seconds), so it is first scaled to integer
 * milliseconds: `fps = reduce(round(hint * 1000) / round(duration * 1000))`.
 * NTSC-style durations such as `60 * 1001 / 30000` round-trip through
 * milliseconds (`2002`) to exactly `{ num: 30000, den: 1001 }`.
 *
 * @param frameCountHint Exact frame count (positive safe integer)
 * @param durationSeconds Media duration in seconds (must be > 0 and finite)
 * @returns Exact reduced fps, or `{ num: 30, den: 1 }` on degenerate inputs
 */
const fpsFromHint = (frameCountHint: number, durationSeconds: number): ProbeRational => {
  if (
    !Number.isSafeInteger(frameCountHint) ||
    frameCountHint < 1 ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return { ...DEFAULT_FPS };
  }
  const scaledNum = Math.round(frameCountHint * 1000);
  const scaledDen = Math.round(durationSeconds * 1000);
  if (scaledNum < 1 || scaledDen < 1) {
    return { ...DEFAULT_FPS };
  }
  return reduceRational(scaledNum, scaledDen);
};

/**
 * Synchronously probe a video element (or mock) into a {@link ProbedVideo}.
 * Pure and testable in Node with a mock satisfying {@link ProbeableVideoElement}.
 *
 * - `fps`: exact rational — derived via `reduce(frameCountHint / duration)`
 *   when a hint and positive duration are available, else `{ num: 30, den: 1 }`.
 * - `frameCount`: `frameCountHint ?? (duration > 0 ? round(duration * 30) : 0)`.
 *   This is an ESTIMATE; exact counts come from decode (future VideoDecoder work).
 * - `isVFR`: heuristic from `getVideoPlaybackQuality` when available —
 *   `droppedVideoFrames > 0` implies variable frame rate; missing API means `false`.
 *
 * @param videoElement Element (or mock) carrying duration and dimensions
 * @param sourceInfo Optional caller-known hints (codec, count, color, alpha)
 * @returns Probed video summary with exact-rational fps
 */
export const probeVideoFallback = (
  videoElement: ProbeableVideoElement,
  sourceInfo: ProbeSourceInfo,
): ProbedVideo => {
  const duration = videoElement.duration;
  const hint = sourceInfo.frameCountHint;
  const codec = sourceInfo.codec ?? '';
  const alpha = detectAlphaFromCodec(codec);
  const hasAlpha = sourceInfo.hasAlpha ?? alpha.hasAlpha;
  const fps = hint !== undefined && duration > 0 ? fpsFromHint(hint, duration) : { ...DEFAULT_FPS };
  const frameCount =
    hint !== undefined
      ? hint
      : duration > 0 && Number.isFinite(duration)
        ? Math.round(duration * 30)
        : 0;

  let isVFR = false;
  if (typeof videoElement.getVideoPlaybackQuality === 'function') {
    try {
      const quality = videoElement.getVideoPlaybackQuality();
      isVFR = quality.droppedVideoFrames > 0;
    } catch {
      isVFR = false;
    }
  }

  return {
    fps,
    frameCount,
    colorSpace: parseColorSpace(sourceInfo.colorSpace),
    hasAlpha,
    alphaMode: hasAlpha ? alpha.mode : null,
    isVFR,
    codec,
    width: videoElement.videoWidth,
    height: videoElement.videoHeight,
    duration,
  };
};

/**
 * Check for a browser environment with WebCodecs support.
 *
 * @returns True only when `window`, `document`, `VideoDecoder`,
 * and `AudioDecoder` globals exist
 */
const isBrowserWithWebCodecs = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof VideoDecoder !== 'undefined' &&
    typeof AudioDecoder !== 'undefined'
  );
};

/**
 * Full-path probe: in a browser, creates a video element for the blob, waits
 * for `loadedmetadata`, then delegates all value logic to
 * {@link probeVideoFallback}. Outside a browser, rejects with the same
 * environment error this package already uses.
 *
 * No real decoding is performed here — that belongs to future VideoDecoder
 * work. The contract is a documented, correctly-typed probing path with
 * exact-rational fps.
 *
 * @param blob The video blob to probe
 * @returns Promise resolving to the probed video summary
 * @throws Error when not in a browser environment with WebCodecs support
 */
export const probeVideo = async (blob: Blob): Promise<ProbedVideo> => {
  if (!isBrowserWithWebCodecs()) {
    throw new Error(
      'WebCodecs parser requires a browser environment with window, document, VideoDecoder, and AudioDecoder globals',
    );
  }

  const url = URL.createObjectURL(blob);
  try {
    const videoElement = document.createElement('video');
    const metadataLoaded = new Promise<void>((resolve, reject) => {
      const handleLoadedMetadata = (): void => {
        resolve();
        cleanup();
      };
      const handleError = (e: Event): void => {
        reject(e);
        cleanup();
      };
      const cleanup = (): void => {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('error', handleError);
      };
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('error', handleError);
    });

    videoElement.src = url;
    await metadataLoaded;

    const probed = probeVideoFallback(videoElement, {});
    URL.revokeObjectURL(url);
    return probed;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
};
