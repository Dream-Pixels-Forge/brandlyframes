/**
 * @brandlyframes/benchmark — benchmark types [BF-203]
 *
 * Types for comparing render paths, measuring speedup, and verifying
 * output within tolerance.
 */

import type { RenderResult } from '@brandlyframes/renderer-webgpu';

/** Result of benchmarking a single render path. */
export interface PathBenchmarkResult {
  /** Backend name. */
  readonly backend: string;
  /** Number of frames rendered. */
  readonly frameCount: number;
  /** Total time in milliseconds. */
  readonly totalDurationMs: number;
  /** Average time per frame (ms). */
  readonly averageDurationMs: number;
  /** Frames per second. */
  readonly framesPerSecond: number;
  /** Per-frame durations (ms), in frame order. */
  readonly frameDurations: readonly number[];
  /** A hash of the last rendered frame's pixels (for tolerance comparison). */
  readonly lastFrameHash?: string;
}

/** Comparison between two render paths. */
export interface PathComparison {
  /** Screenshot (baseline) path result. */
  readonly baseline: PathBenchmarkResult;
  /** GPU (candidate) path result. */
  readonly candidate: PathBenchmarkResult;
  /** Speedup factor: baseline.averageDurationMs / candidate.averageDurationMs. */
  readonly speedup: number;
  /** Whether the speedup meets the 3x target. */
  readonly meetsSpeedupTarget: boolean;
  /** Maximum pixel difference between baseline and candidate last frames. */
  readonly maxPixelDiff: number;
  /** Whether outputs are within tolerance. */
  readonly withinTolerance: boolean;
  /** Tolerance used for pixel comparison (0..1). */
  readonly tolerance: number;
}

/** Full benchmark report. */
export interface BenchmarkReport {
  /** Timestamp when the benchmark ran. */
  readonly timestamp: number;
  /** Number of frames rendered per path. */
  readonly frameCount: number;
  /** Comparisons (baseline vs candidate). */
  readonly comparisons: readonly PathComparison[];
  /** Overall summary. */
  readonly summary: {
    readonly backendCount: number;
    readonly fastestBackend: string;
    readonly slowestBackend: string;
    readonly allWithinTolerance: boolean;
    readonly anyMeetsSpeedupTarget: boolean;
  };
}

/** Options for running a benchmark. */
export interface BenchmarkOptions {
  /** Number of frames to render per path. Default 10. */
  readonly frameCount?: number;
  /** Width in pixels. Default 1280. */
  readonly width?: number;
  /** Height in pixels. Default 720. */
  readonly height?: number;
  /** URL to render (for screenshot path). Default 'about:blank'. */
  readonly url?: string;
  /** Pixel comparison tolerance (0..1). Default 0.01 (1%). */
  readonly tolerance?: number;
  /** Speedup target factor. Default 3. */
  readonly speedupTarget?: number;
}

/** A render path that can be benchmarked. */
export interface BenchmarkablePath {
  readonly backend: string;
  renderFrame(options: {
    readonly url: string;
    readonly frame: number;
    readonly width: number;
    readonly height: number;
  }): Promise<RenderResult>;
}
