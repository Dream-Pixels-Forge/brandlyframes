/**
 * @brandlyframes/benchmark — benchmark suite [BF-203]
 *
 * Compares render paths (e.g. screenshot vs GPU), measures speedup, and
 * verifies output is within tolerance. Target: GPU path ≥ 3x faster than
 * screenshot path with matching output within tolerance.
 */

import type { RenderResult } from '@brandlyframes/renderer-webgpu';
import type {
  BenchmarkablePath,
  BenchmarkOptions,
  BenchmarkReport,
  PathBenchmarkResult,
  PathComparison,
} from './types.js';

const DEFAULT_FRAME_COUNT = 10;
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const DEFAULT_URL = 'about:blank';
const DEFAULT_TOLERANCE = 0.01; // 1% max pixel difference
const DEFAULT_SPEEDUP_TARGET = 3;

/**
 * Benchmark a single render path by rendering N frames.
 */
async function benchmarkPath(
  path: BenchmarkablePath,
  options: Required<BenchmarkOptions>,
): Promise<PathBenchmarkResult> {
  const frameDurations: number[] = [];
  let lastResult: RenderResult | null = null;

  for (let frame = 0; frame < options.frameCount; frame++) {
    const start = performance.now();
    lastResult = await path.renderFrame({
      url: options.url,
      frame,
      width: options.width,
      height: options.height,
    });
    frameDurations.push(performance.now() - start);
  }

  const totalDurationMs = frameDurations.reduce((sum, d) => sum + d, 0);
  const averageDurationMs =
    frameDurations.length > 0 ? totalDurationMs / frameDurations.length : 0;
  const framesPerSecond =
    averageDurationMs > 0 ? 1000 / averageDurationMs : 0;

  let lastFrameHash: string | undefined;
  if (lastResult) {
    lastFrameHash = hashPixels(lastResult.pixels);
  }

  return {
    backend: path.backend,
    frameCount: options.frameCount,
    totalDurationMs,
    averageDurationMs,
    framesPerSecond,
    frameDurations,
    lastFrameHash,
  };
}

/** Hash pixel data into a short string for comparison. */
function hashPixels(pixels: Uint8ClampedArray): string {
  let hash = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    hash = (hash << 5) - hash + pixels[i];
    hash = (hash << 5) - hash + pixels[i + 1];
    hash = (hash << 5) - hash + pixels[i + 2];
    hash = (hash << 5) - hash + pixels[i + 3];
    hash |= 0;
  }
  return hash.toString(16);
}

/** Compare two pixel arrays and return max absolute difference per channel. */
function maxPixelDiff(
  a: Uint8ClampedArray,
  b: Uint8ClampedArray,
): number {
  const len = Math.min(a.length, b.length);
  let max = 0;
  for (let i = 0; i < len; i++) {
    const diff = Math.abs(a[i] - b[i]);
    if (diff > max) max = diff;
  }
  return max;
}

/** Compare two render paths and produce a comparison report. */
export async function comparePaths(
  baseline: BenchmarkablePath,
  candidate: BenchmarkablePath,
  options: BenchmarkOptions = {},
): Promise<PathComparison> {
  const frameCount = options.frameCount ?? DEFAULT_FRAME_COUNT;
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const url = options.url ?? DEFAULT_URL;
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const speedupTarget = options.speedupTarget ?? DEFAULT_SPEEDUP_TARGET;

  // Run sequentially so each path gets undivided CPU time (JS is single-threaded;
  // concurrent execution would interleave busy-waits and skew timing).
  const baseResult = await benchmarkPath(baseline, {
    frameCount,
    width,
    height,
    url,
    tolerance,
    speedupTarget,
  });
  const candResult = await benchmarkPath(candidate, {
    frameCount,
    width,
    height,
    url,
    tolerance,
    speedupTarget,
  });

  const speedup =
    baseResult.averageDurationMs > 0
      ? baseResult.averageDurationMs / candResult.averageDurationMs
      : 0;

  // Compare last frames for output tolerance by re-rendering one frame
  // from each path (sequential, undivided CPU time).
  let maxDiff = 0;
  let comparisonFailed = false;
  try {
    const baseFrame = await baseline.renderFrame({
      url,
      frame: frameCount - 1,
      width,
      height,
    });
    const candFrame = await candidate.renderFrame({
      url,
      frame: frameCount - 1,
      width,
      height,
    });
    maxDiff = maxPixelDiff(baseFrame.pixels, candFrame.pixels);
  } catch {
    comparisonFailed = true;
  }

  const withinTolerance =
    !comparisonFailed && maxDiff <= tolerance * 255;

  return {
    baseline: baseResult,
    candidate: candResult,
    speedup,
    meetsSpeedupTarget: speedup >= speedupTarget,
    maxPixelDiff: comparisonFailed ? -1 : maxDiff,
    withinTolerance,
    tolerance,
  };
}

/** Run a full benchmark across multiple path pairs. */
export async function runBenchmark(
  paths: readonly BenchmarkablePath[],
  options: BenchmarkOptions = {},
): Promise<BenchmarkReport> {
  const frameCount = options.frameCount ?? DEFAULT_FRAME_COUNT;
  const speedupTarget = options.speedupTarget ?? DEFAULT_SPEEDUP_TARGET;

  // Benchmark each path individually, sequentially (undivided CPU time).
  const individual: PathBenchmarkResult[] = [];
  for (const p of paths) {
    individual.push(
      await benchmarkPath(p, {
        frameCount,
        width: options.width ?? DEFAULT_WIDTH,
        height: options.height ?? DEFAULT_HEIGHT,
        url: options.url ?? DEFAULT_URL,
        tolerance: options.tolerance ?? DEFAULT_TOLERANCE,
        speedupTarget,
      }),
    );
  }

  // Build comparisons: compare each path against the first (baseline).
  const comparisons: PathComparison[] = [];
  if (individual.length >= 2) {
    const baseline = paths[0];
    for (let i = 1; i < individual.length; i++) {
      comparisons.push(await comparePaths(baseline, paths[i], options));
    }
  }

  const sorted = [...individual].sort(
    (a, b) => a.averageDurationMs - b.averageDurationMs,
  );
  const fastest = sorted[0];
  const slowest = sorted[sorted.length - 1];

  return {
    timestamp: Date.now(),
    frameCount,
    comparisons,
    summary: {
      backendCount: individual.length,
      fastestBackend: fastest.backend,
      slowestBackend: slowest.backend,
      allWithinTolerance:
        comparisons.length === 0 ||
        comparisons.every((c) => c.withinTolerance),
      anyMeetsSpeedupTarget:
        comparisons.length === 0 ||
        comparisons.some((c) => c.meetsSpeedupTarget),
    },
  };
}

/** Format a benchmark report as human-readable text. */
export function formatReport(report: BenchmarkReport): string {
  const lines: string[] = [];
  lines.push('BrandlyFrames Benchmark');
  lines.push('=======================');
  lines.push(`Frames: ${report.frameCount}`);
  lines.push(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
  lines.push('');

  for (const comp of report.comparisons) {
    lines.push(
      `${comp.baseline.backend} → ${comp.candidate.backend}:`,
    );
    lines.push(
      `  baseline: ${comp.baseline.averageDurationMs.toFixed(2)} ms/frame (${comp.baseline.framesPerSecond.toFixed(1)} fps)`,
    );
    lines.push(
      `  candidate: ${comp.candidate.averageDurationMs.toFixed(2)} ms/frame (${comp.candidate.framesPerSecond.toFixed(1)} fps)`,
    );
    lines.push(
      `  speedup: ${comp.speedup.toFixed(2)}x ${
        comp.meetsSpeedupTarget ? '✓ meets target' : '✗ below target'
      }`,
    );
    if (comp.maxPixelDiff >= 0) {
      lines.push(
        `  max pixel diff: ${comp.maxPixelDiff} (tolerance ${(
          comp.tolerance * 100
        ).toFixed(0)}%) ${
          comp.withinTolerance ? '✓ within tolerance' : '✗ exceeds tolerance'
        }`,
      );
    } else {
      lines.push(`  pixel comparison: skipped (path unavailable)`);
    }
    lines.push('');
  }

  lines.push('Summary:');
  lines.push(`  fastest: ${report.summary.fastestBackend}`);
  lines.push(`  slowest: ${report.summary.slowestBackend}`);
  lines.push(
    `  all within tolerance: ${report.summary.allWithinTolerance}`,
  );
  lines.push(
    `  any meets speedup target: ${report.summary.anyMeetsSpeedupTarget}`,
  );

  return lines.join('\n');
}
