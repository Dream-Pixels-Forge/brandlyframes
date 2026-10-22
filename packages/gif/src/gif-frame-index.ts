import type { DecodedGif } from './types';

/**
 * `mapGifFrameIndex` — maps a composition frame to a GIF source frame index
 * [BF-054 equivalent for animated GIF].
 *
 * Walks the GIF's frames, accumulating each frame's delay
 * (`delayCentiseconds * 10` ms), and returns the frame whose half-open
 * time interval contains the composition frame's presentation time
 * (`compositionFrame / fps * 1000` ms). Looping follows the NETSCAPE
 * convention: `loopCount === 0` loops forever; otherwise the animation
 * plays `loopCount` times then holds on the last frame.
 *
 * Pure TypeScript: no React, no DOM, no canvas — deterministic for the
 * same inputs and safe in render workers / Node.
 *
 * @param compositionFrame - composition frame index (non-negative integer)
 * @param fps - composition frame rate (finite number > 0)
 * @param gif - decoded GIF (at least one frame)
 * @returns source frame index within `gif.frames`
 * @throws {Error} on invalid `compositionFrame`, `fps`, or a GIF with no frames
 */
export const mapGifFrameIndex = (
  compositionFrame: number,
  fps: number,
  gif: DecodedGif,
): number => {
  if (!Number.isSafeInteger(compositionFrame) || compositionFrame < 0) {
    throw new Error(
      `mapGifFrameIndex: composition frame must be a non-negative safe integer, got ${compositionFrame}`,
    );
  }
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error(
      `mapGifFrameIndex: fps must be a finite number > 0, got ${String(fps)}`,
    );
  }
  if (gif.frames.length === 0) {
    throw new Error('mapGifFrameIndex: gif must contain at least one frame');
  }
  const lastIndex = gif.frames.length - 1;
  if (lastIndex === 0) {
    return 0;
  }

  const frameDurationMs = 1000 / fps;
  const totalTimeMs = compositionFrame * frameDurationMs;

  // Per-loop duration in ms (sum of per-frame delays, centiseconds * 10).
  let perLoopMs = 0;
  for (const frame of gif.frames) {
    perLoopMs += frame.delayCentiseconds * 10;
  }

  let effectiveTimeMs = totalTimeMs;
  if (gif.loopCount === 0) {
    // Infinite loop: wrap within a single loop period.
    if (perLoopMs > 0) {
      effectiveTimeMs = totalTimeMs % perLoopMs;
    }
  } else {
    const totalAvailableMs = perLoopMs * gif.loopCount;
    if (totalTimeMs >= totalAvailableMs) {
      return lastIndex;
    }
    if (perLoopMs > 0) {
      effectiveTimeMs = totalTimeMs % perLoopMs;
    }
  }

  // Walk frames; frame i shows during [cumulativeStart, cumulativeStart + delay).
  let elapsedMs = 0;
  for (let i = 0; i < gif.frames.length; i++) {
    const delayMs = gif.frames[i].delayCentiseconds * 10;
    const nextElapsed = elapsedMs + delayMs;
    if (effectiveTimeMs < nextElapsed) {
      return i;
    }
    elapsedMs = nextElapsed;
  }
  return lastIndex;
};
