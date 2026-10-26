/**
 * BF-203: side-by-side scene benchmark suite.
 *
 * Benchmarks two render paths (screenshot baseline vs WebGPU/renderer
 * path) on the 3 standard scenes, checks output tolerance per scene, and
 * aggregates a measured speedup. The 3x claim is VALIDATED here — the
 * report carries the measured number and a meets/below verdict; it is
 * never asserted.
 */

import {
  sceneUrl,
  STANDARD_SCENES,
  type StandardScene,
} from './scenes.js';
import type {
  BenchmarkablePath,
  PathBenchmarkResult,
} from './types.js';

/** Options for {@link runSceneBenchmark}. */
export interface SceneBenchmarkOptions {
  /** Scene ids to benchmark (default: all 3 standard scenes). */
  readonly scenes?: readonly string[];
  /** Frames rendered per scene (default: the scene's frameCount). */
  readonly framesPerScene?: number;
  /** Pixel tolerance (0..1), max fraction a channel may differ. Default 0.01. */
  readonly tolerance?: number;
  /** Speedup target for the verdict. Default 3. */
  readonly speedupTarget?: number;
}

/** Result of benchmarking one scene through both paths. */
export interface SceneBenchmarkResult {
  readonly sceneId: string;
  readonly baseline: PathBenchmarkResult;
  readonly candidate: PathBenchmarkResult;
  readonly speedup: number;
  readonly maxPixelDiff: number;
  readonly withinTolerance: boolean;
}

/** Aggregate report across the scene set. */
export interface SceneBenchmarkReport {
  readonly scenes: readonly SceneBenchmarkResult[];
  /** Aggregate speedup: total baseline ms / total candidate ms. */
  readonly measuredSpeedup: number;
  readonly speedupTarget: number;
  readonly meetsSpeedupTarget: boolean;
  readonly allWithinTolerance: boolean;
}

/** Benchmark one path on one scene and time each frame. */
async function benchmarkSceneFrame(
  path: BenchmarkablePath,
  scene: StandardScene,
  frame: number,
): Promise<{ ms: number; pixels: Uint8ClampedArray }> {
  const url = sceneUrl(scene.id);
  const start = performance.now();
  const result = await path.renderFrame({
    url,
    frame,
    width: scene.width,
    height: scene.height,
  });
  return { ms: performance.now() - start, pixels: result.pixels };
}

/** Max absolute per-channel pixel difference between two RGBA buffers. */
function maxPixelDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  const len = Math.min(a.length, b.length);
  let max = 0;
  for (let i = 0; i < len; i++) {
    const diff = Math.abs(a[i] - b[i]);
    if (diff > max) max = diff;
  }
  return max;
}

/**
 * Run the side-by-side scene benchmark: both paths render every frame of
 * every scene (sequentially, so each gets undivided CPU time), then one
 * extra frame per scene is re-rendered through both paths for the
 * pixel-tolerance check.
 */
export async function runSceneBenchmark(
  baseline: BenchmarkablePath,
  candidate: BenchmarkablePath,
  options: SceneBenchmarkOptions = {},
): Promise<SceneBenchmarkReport> {
  const tolerance = options.tolerance ?? 0.01;
  const speedupTarget = options.speedupTarget ?? 3;

  const sceneIds = options.scenes ?? STANDARD_SCENES.map((s) => s.id);
  const scenes: SceneBenchmarkResult[] = [];
  let totalBaselineMs = 0;
  let totalCandidateMs = 0;

  for (const sceneId of sceneIds) {
    const scene = STANDARD_SCENES.find((s) => s.id === sceneId);
    if (!scene) {
      throw new Error(
        `runSceneBenchmark: unknown scene "${sceneId}" (known: ${STANDARD_SCENES.map((s) => s.id).join(', ')})`,
      );
    }
    const frameCount = options.framesPerScene ?? scene.frameCount;

    let baselineMs = 0;
    let candidateMs = 0;
    for (let frame = 0; frame < frameCount; frame++) {
      baselineMs += (await benchmarkSceneFrame(baseline, scene, frame)).ms;
      candidateMs += (await benchmarkSceneFrame(candidate, scene, frame)).ms;
    }
    totalBaselineMs += baselineMs;
    totalCandidateMs += candidateMs;

    const toResult = (
      path: BenchmarkablePath,
      totalMs: number,
    ): PathBenchmarkResult => ({
      backend: path.backend,
      frameCount,
      totalDurationMs: totalMs,
      averageDurationMs: frameCount > 0 ? totalMs / frameCount : 0,
      framesPerSecond: frameCount > 0 && totalMs > 0 ? (frameCount / totalMs) * 1000 : 0,
      frameDurations: [],
    });

    // Tolerance check: re-render one frame through both paths and compare.
    const baseFrame = await benchmarkSceneFrame(baseline, scene, frameCount - 1);
    const candFrame = await benchmarkSceneFrame(candidate, scene, frameCount - 1);
    const maxDiff = maxPixelDiff(baseFrame.pixels, candFrame.pixels);

    const speedup = candidateMs > 0 ? baselineMs / candidateMs : 0;
    scenes.push({
      sceneId,
      baseline: toResult(baseline, baselineMs),
      candidate: toResult(candidate, candidateMs),
      speedup,
      maxPixelDiff: maxDiff,
      withinTolerance: maxDiff <= tolerance * 255,
    });
  }

  const measuredSpeedup = totalCandidateMs > 0 ? totalBaselineMs / totalCandidateMs : 0;
  return {
    scenes,
    measuredSpeedup,
    speedupTarget,
    meetsSpeedupTarget: measuredSpeedup >= speedupTarget,
    allWithinTolerance: scenes.every((s) => s.withinTolerance),
  };
}

/** Format the scene benchmark as an ASCII comparison table. */
export function formatComparisonTable(report: SceneBenchmarkReport): string {
  const lines: string[] = [];
  lines.push('BrandlyFrames Benchmark — Standard Scenes (side-by-side)');
  lines.push('========================================================');
  const first = report.scenes[0];
  lines.push(
    `baseline: ${first?.baseline.backend ?? 'n/a'} | candidate: ${first?.candidate.backend ?? 'n/a'}`,
  );
  lines.push(
    'scene           | baseline ms/f | candidate ms/f | speedup | tolerance',
  );
  lines.push('----------------|---------------|----------------|---------|----------');
  for (const s of report.scenes) {
    const sceneName = s.sceneId.padEnd(15);
    const base = s.baseline.averageDurationMs.toFixed(2).padStart(13);
    const cand = s.candidate.averageDurationMs.toFixed(2).padStart(14);
    const speed = `${s.speedup.toFixed(2)}x`.padStart(7);
    const tol = s.withinTolerance
      ? `✓ (max Δ${s.maxPixelDiff})`
      : `✗ (max Δ${s.maxPixelDiff})`;
    lines.push(`${sceneName} | ${base} | ${cand} | ${speed} | ${tol}`);
  }
  lines.push('');
  lines.push(
    `Measured aggregate speedup: ${report.measuredSpeedup.toFixed(2)}x ` +
      `(target ${report.speedupTarget}x — ${
        report.meetsSpeedupTarget ? 'MEETS target' : 'BELOW target'
      })`,
  );
  lines.push(
    `Output tolerance: ${report.allWithinTolerance ? 'all scenes within tolerance ✓' : 'tolerance EXCEEDED on one or more scenes ✗'}`,
  );
  return lines.join('\n');
}

// Re-exports keep the existing single-path comparison API importable
// alongside the scene suite without changing its import surface.
export type {
  BenchmarkablePath,
  BenchmarkOptions,
  BenchmarkReport,
  PathBenchmarkResult,
  PathComparison,
} from './types.js';
export type { StandardScene };
