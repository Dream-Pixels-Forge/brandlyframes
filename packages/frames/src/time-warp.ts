/**
 * BF-509 / BF-510 — deterministic time-warp math for BrandlyFrames.
 *
 * Pure functions: `(frame, options) -> source frame`. No React, no wall
 * clock, no `Math.random`. The same input always yields the same output, so
 * preview and render match exactly.
 *
 * Exported functions:
 * - `reverseFrame(frame, start, end)` — remap `frame` into the reversed
 *   range `[start, end]` (BF-510). E.g. `reverseFrame(frame, 300, 0)`
 *   plays frames 300→0.
 * - `pingPongFrame(frame, duration)` — ping-pong `frame` within
 *   `[0, duration]` (BF-510): forward 0→duration, back duration→0, repeat.
 * - `variableSpeedFrame(frame, segments)` — per-segment speed remap
 *   (BF-509 "variable speed within one composition").
 * - `layerFrame(frame, baseFps, layerFps)` — polyrhythmic per-layer frame
 *   rate (BF-509): a 12fps background layer on a 24fps timeline.
 * - `layerTimeline(fpsMap)` — returns a per-layer `frame -> layerFrame`
 *   resolver for compositions with mixed frame rates.
 */

// ---------------------------------------------------------------------------
// BF-510 — reverse & ping-pong
// ---------------------------------------------------------------------------

/**
 * Remap `frame` to a reversed playback of the range `[start, end]`.
 *
 * - `start` > `end`: plays `start, start-1, ..., end` (reverse).
 * - `start` < `end`: plays `end, end+1, ..., start` (also reversed, so
 *   "reverse from start to end" in both directions).
 * - Frames outside the range are clamped to the range endpoints.
 *
 * @param frame - the composition's current frame (0-based)
 * @param start - one end of the range (e.g. 300)
 * @param end - the other end of the range (e.g. 0)
 * @returns the source frame to sample for this composition frame
 */
export const reverseFrame = (frame: number, start: number, end: number): number => {
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const span = hi - lo;
  if (span === 0) return lo;
  // Map frame 0..span → hi..lo (reversed).
  const clamped = Math.min(Math.max(frame, 0), span);
  return hi - clamped;
};

/**
 * Ping-pong `frame` within `[0, duration]`:
 * 0→1→2→…→duration→duration-1→…→1→0→1→…
 *
 * The period is `2 * duration` frames.
 *
 * @param frame - the composition's current frame (0-based)
 * @param duration - one direction's length in frames (e.g. 60)
 * @returns the source frame to sample (0..duration)
 */
export const pingPongFrame = (frame: number, duration: number): number => {
  if (duration <= 0) return 0;
  const period = 2 * duration;
  const t = ((frame % period) + period) % period;
  if (t <= duration) return t;
  return period - t;
};

// ---------------------------------------------------------------------------
// BF-509 — variable speed & polyrhythmic per-layer fps
// ---------------------------------------------------------------------------

export interface SpeedSegment {
  /** Composition frame where this segment starts. */
  readonly start: number;
  /** Composition frame where this segment ends (exclusive). */
  readonly end: number;
  /** Playback speed for this segment (1 = normal, 0.5 = half speed, 2 = 2×). */
  readonly speed: number;
}

/**
 * Remap a composition frame through a list of per-segment speeds.
 *
 * The segments must tile `[0, ∞)` in order. For a frame `f` that falls in
 * segment `[start, end)`, the source frame is computed by integrating the
 * speed across all preceding segments plus the speed within the current
 * segment.
 *
 * @param frame - the composition's current frame (0-based)
 * @param segments - ordered speed segments
 * @returns the source frame to sample
 */
export const variableSpeedFrame = (frame: number, segments: readonly SpeedSegment[]): number => {
  if (segments.length === 0) return frame;
  if (frame < 0) return 0;

  // Find the segment containing `frame`.
  let accumulated = 0;
  for (const seg of segments) {
    if (frame < seg.start) break;
    if (frame >= seg.start && frame < seg.end) {
      const local = frame - seg.start;
      return accumulated + local / seg.speed;
    }
    accumulated += (seg.end - seg.start) / seg.speed;
  }
  // Past all segments: continue at the last segment's speed.
  const last = segments[segments.length - 1];
  const extra = frame - last.end;
  return accumulated + extra / last.speed;
};

/**
 * Polyrhythmic per-layer frame rate (BF-509).
 *
 * Given a base timeline frame rate and a layer's frame rate, returns the
 * source frame the layer should sample at composition frame `frame`.
 *
 * Example: a 12fps background layer on a 24fps timeline — the background
 * advances 1 source frame every 2 composition frames:
 *
 * ```ts
 * layerFrame(0, 24, 12) → 0
 * layerFrame(1, 24, 12) → 0
 * layerFrame(2, 24, 12) → 1
 * layerFrame(3, 24, 12) → 1
 * ```
 *
 * @param frame - the composition's current frame (0-based)
 * @param baseFps - the timeline's frame rate (e.g. 24)
 * @param layerFps - the layer's frame rate (e.g. 12). May be lower, equal,
 *   or higher than `baseFps`.
 * @returns the source frame index for this layer
 */
export const layerFrame = (frame: number, baseFps: number, layerFps: number): number => {
  if (baseFps <= 0) return 0;
  if (layerFps <= 0) return 0;
  // Ratio of layer frames per base frame.
  return Math.floor((frame * layerFps) / baseFps);
};

/**
 * A per-layer frame-rate map for a composition (BF-509 "polyrhythmic time").
 *
 * ```ts
 * const timeline = layerTimeline({ foreground: 24, background: 12, ui: 6 });
 * timeline.background(48) → 24   // 48 * 12 / 24
 * timeline.ui(48) → 16          // 48 * 6 / 24
 * ```
 */
export interface LayerTimeline {
  readonly baseFps: number;
  readonly layers: Readonly<Record<string, number>>;
  /** Resolve a layer's source frame at composition frame `frame`. */
  readonly at: (frame: number, layer: string) => number;
}

export const layerTimeline = (config: {
  readonly baseFps: number;
  readonly layers: Record<string, number>;
}): LayerTimeline => {
  const { baseFps, layers } = config;
  return {
    baseFps,
    layers,
    at(frame: number, layer: string): number {
      const fps = layers[layer];
      if (fps === undefined) {
        throw new Error(`layerTimeline.at: unknown layer "${layer}" (known: ${Object.keys(layers).join(', ')})`);
      }
      return layerFrame(frame, baseFps, fps);
    },
  };
};

// ---------------------------------------------------------------------------
// Combined time-warp (BF-509 + BF-510)
// ---------------------------------------------------------------------------

export interface TimeWarpOptions {
  /** Optional speed segments (BF-509 variable speed). */
  readonly segments?: readonly SpeedSegment[];
  /** Optional reverse range applied *before* speed segments. */
  readonly reverse?: readonly [start: number, end: number];
  /** Optional ping-pong duration applied *after* speed segments. */
  readonly pingPongDuration?: number;
}

/**
 * Apply a full time-warp pipeline to a composition frame:
 *
 * 1. `reverse` (if set) — flip the frame into the reversed range.
 * 2. `segments` (if set) — variable-speed remap.
 * 3. `pingPongDuration` (if set) — ping-pong the result.
 *
 * The pipeline is deterministic and pure.
 *
 * @param frame - the composition's current frame
 * @param options - time-warp configuration
 * @returns the source frame to sample
 */
export const timeWarpFrame = (frame: number, options: TimeWarpOptions = {}): number => {
  let f = frame;

  // 1) Reverse (applied to the raw frame before speed).
  if (options.reverse) {
    f = reverseFrame(f, options.reverse[0], options.reverse[1]);
  }

  // 2) Variable speed.
  if (options.segments && options.segments.length > 0) {
    f = variableSpeedFrame(f, options.segments);
  }

  // 3) Ping-pong.
  if (options.pingPongDuration !== undefined) {
    f = pingPongFrame(f, options.pingPongDuration);
  }

  return Math.max(0, Math.floor(f));
};
