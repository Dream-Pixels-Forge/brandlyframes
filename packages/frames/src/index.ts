/**
 * @brandlyframes/frames — frame-exact timestamp mapping, rational timebase [BF-051]
 *
 * PTS lives on a 90 kHz timescale: {@link PTS_DENOMINATOR} ticks per second.
 * Conversions use only integer/BigInt arithmetic — no floating point — so
 * there is no float drift for any rational frame rate, including NTSC
 * fractional rates such as 24000/1001.
 *
 * Clean-room implementation.
 */

/**
 * Rational number, e.g. `{ num: 30000, den: 1001 }` for 29.97 fps.
 * Both fields must be safe integers; `den` must be strictly positive.
 */
export interface Rational {
  /** Numerator (frames per second numerator). Must be a positive integer. */
  num: number;
  /** Denominator (frames per second denominator). Must be a positive integer. */
  den: number;
}

/**
 * PTS timescale denominator: 90 000 ticks per second (90 kHz),
 * the MPEG common-timescale convention.
 */
export const PTS_DENOMINATOR: bigint = 90000n;

/**
 * Validates a {@link Rational} frame rate.
 *
 * @param fps - frame rate to validate
 * @throws {Error} if `num` or `den` is not a safe integer, or either is < 1
 */
export const validateRational = (fps: Rational): void => {
  if (!Number.isSafeInteger(fps.num) || !Number.isSafeInteger(fps.den)) {
    throw new Error(
      `Rational num/den must be safe integers, got { num: ${fps.num}, den: ${fps.den} }`
    );
  }
  if (fps.num < 1) {
    throw new Error(`Rational num must be >= 1, got ${fps.num}`);
  }
  if (fps.den < 1) {
    throw new Error(`Rational den must be >= 1 (non-zero, positive), got ${fps.den}`);
  }
};

/**
 * Maps a frame index to its exact PTS on the 90 kHz timescale.
 *
 * Ticks per frame `T = PTS_DENOMINATOR * fps.den / fps.num` is fractional for
 * NTSC rates (e.g. 24000/1001 → 3753.75). This function uses ceiling BigInt
 * division so the result lands inside frame n's half-open tick interval
 * `[n·T, (n+1)·T)`, guaranteeing `ptsToFrame(frameToPts(n, fps), fps) === n`.
 * For integral `T` (integer rates and 30000/1001) ceiling coincides with
 * plain division: `frameToPts(1, { num: 30000, den: 1001 }) === 3003n`.
 *
 * @param frame - frame index (non-negative integer)
 * @param fps - rational frame rate
 * @returns PTS in 90 kHz ticks (bigint)
 * @throws {Error} if `frame` is negative or not an integer, or `fps` is invalid
 */
export const frameToPts = (frame: number, fps: Rational): bigint => {
  validateRational(fps);
  if (!Number.isSafeInteger(frame) || frame < 0) {
    throw new Error(`frame must be a non-negative safe integer, got ${frame}`);
  }
  const bigNum = BigInt(fps.num);
  const bigDen = BigInt(fps.den);
  // Ceiling division: (a + b - 1) / b for non-negative a.
  const ticks = BigInt(frame) * PTS_DENOMINATOR * bigDen;
  return (ticks + bigNum - 1n) / bigNum;
};

/**
 * Inverse of {@link frameToPts}: maps a 90 kHz PTS back to a frame index
 * using floor division, i.e. the frame whose interval contains `pts`.
 *
 * @param pts - timestamp in 90 kHz ticks (non-negative bigint)
 * @param fps - rational frame rate
 * @returns frame index (non-negative integer)
 * @throws {Error} if `pts` is negative or not a bigint, or `fps` is invalid
 */
export const ptsToFrame = (pts: bigint, fps: Rational): number => {
  validateRational(fps);
  if (typeof pts !== 'bigint' || pts < 0n) {
    throw new Error(`pts must be a non-negative bigint, got ${String(pts)}`);
  }
  const frame = (pts * BigInt(fps.num)) / (PTS_DENOMINATOR * BigInt(fps.den));
  return Number(frame);
};

// --- FrameStore [BF-052] — content-hashed keys + LRU memory cache ---

export { deriveFrameKey, FrameStore } from './frame-store';
export type { FrameStoreOptions } from './frame-store';

// --- FPS conversion modes [BF-055] — exact / nearest / blend ---

export { convertFrameIndex } from './fps-conversion';
export type { FpsConversionMode } from './fps-conversion';

// --- <FrameVideo> [BF-054] — trim / playbackRate / reverse / freeze / ping-pong ---

export { mapFrameVideoIndex, FrameVideo } from './frame-video';
export type { FrameVideoOptions, FrameVideoProps } from './frame-video';

// --- <FrameAudio> [BF-059] — slicing + pitch-preserve ---

export { mapFrameAudioIndex, FrameAudio } from './frame-audio';
export type { FrameAudioOptions, FrameAudioProps } from './frame-audio';

// --- useVideoFrame pixel access + prefetch [BF-058] ---

export { mountVideoFrameEffect, planPrefetchFrames } from './use-video-frame';
export type {
  HoldFn,
  MountVideoFrameEffectOptions,
  ReleaseFn,
  VideoFrameData,
  VideoFrameEffectCleanup,
  VideoFrameLoader,
} from './use-video-frame';

// --- VFR normalization via PTS table [BF-056] — CFR frame→source-frame map ---

export { buildPtsTable, ptsTableLookup, normalizeToCfr } from './vfr-normalization';
export type { PtsTable } from './vfr-normalization';

// --- extractFrames API [BF-060] — programmatic frame extraction ---

export { extractFrames, extractFramesToDisk, extractSingleFrame } from './extract-frames';
export type {
  ExtractFramesOptions,
  ExtractFramesToDiskOptions,
  ExtractFramesToDiskResult,
  ExtractedFrame,
} from './extract-frames';

// --- test clip generator [BF-061] — CFR / VFR / alpha clips + perf benchmark ---

export { TEST_CLIPS, generateFrameCounterText, createFrameCounterFrame, generateTestClipManifest, writeTestClipManifest, runPerfBenchmark } from './test-clips';
export type { FrameCounterClipSpec, VFRPattern, PerfBenchmarkResult } from './test-clips';
