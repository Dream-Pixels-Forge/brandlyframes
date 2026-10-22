/**
 * @brandlyframes/profiler — frame profiler types [BF-202]
 *
 * Types for recording per-frame and per-component render timing,
 * identifying slow frames, and producing flame-view data for the Studio.
 */

import type { RenderFrameOptions, RenderResult } from '@brandlyframes/renderer-webgpu';

/** A single timed render of one frame. */
export interface FrameTiming {
  /** Frame index. */
  readonly frame: number;
  /** Backend used: 'screenshot' | 'gpu' | 'cpu'. */
  readonly backend: 'screenshot' | 'gpu' | 'cpu';
  /** Wall-clock time in milliseconds. */
  readonly durationMs: number;
  /** Component that rendered this frame (optional, set by the profiler user). */
  readonly component?: string;
  /** Optional effect steps applied to this frame. */
  readonly effects?: readonly string[];
  /** Timestamp when the render started (ms since epoch). */
  readonly startedAt: number;
}

/** Aggregate timing for one component across all frames. */
export interface ComponentTiming {
  /** Component name. */
  readonly name: string;
  /** Number of frames this component rendered. */
  readonly frameCount: number;
  /** Total time spent rendering this component (ms). */
  readonly totalDurationMs: number;
  /** Average time per frame (ms). */
  readonly averageDurationMs: number;
  /** Slowest single frame for this component (ms). */
  readonly maxDurationMs: number;
}

/** Result of profiling a single render job. */
export interface ProfileResult {
  /** Total frames rendered. */
  readonly frameCount: number;
  /** Total render time (ms). */
  readonly totalDurationMs: number;
  /** Average time per frame (ms). */
  readonly averageDurationMs: number;
  /** Per-frame timings, in frame order. */
  readonly frames: readonly FrameTiming[];
  /** Per-component aggregates. */
  readonly components: readonly ComponentTiming[];
  /** The N slowest frames (descending by duration). */
  readonly slowestFrames: readonly FrameTiming[];
  /** The N slowest components (descending by total time). */
  readonly slowestComponents: readonly ComponentTiming[];
  /** Frames exceeding the slow-frame threshold (ms). */
  readonly slowFrames: readonly FrameTiming[];
}

/** Configuration for the FrameProfiler. */
export interface FrameProfilerOptions {
  /** Milliseconds above which a frame is considered "slow". Default 33 (~1 frame at 30fps). */
  readonly slowFrameThresholdMs?: number;
  /** Number of slowest frames/components to include in the report. Default 10. */
  readonly topN?: number;
  /** Optional component name to attribute renders to. */
  readonly component?: string;
}

/** Flame-view data point for the Studio flame chart. */
export interface FlameViewPoint {
  /** Frame index. */
  readonly frame: number;
  /** Duration in milliseconds. */
  readonly durationMs: number;
  /** Backend used. */
  readonly backend: 'screenshot' | 'gpu' | 'cpu';
  /** Component name (if any). */
  readonly component?: string;
  /** Whether this frame exceeded the slow threshold. */
  readonly isSlow: boolean;
}

/** Backend that the profiler wraps. */
export interface ProfiledRenderPath {
  readonly backendType: 'screenshot' | 'gpu' | 'cpu';
  renderFrame(options: RenderFrameOptions): Promise<RenderResult>;
}
