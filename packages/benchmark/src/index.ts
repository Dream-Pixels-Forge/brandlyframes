/**
 * @brandlyframes/benchmark — benchmark suite [BF-203]
 *
 * Compares render paths, measures speedup, and verifies output within
 * tolerance. Two layers:
 * - `comparePaths` / `runBenchmark` — single-URL path comparison
 * - `runSceneBenchmark` / `formatComparisonTable` — side-by-side
 *   screenshot-baseline vs WebGPU/renderer-path comparison on the
 *   3 standard scenes, with measured (never asserted) 3x verdict
 */

export {
  comparePaths,
  formatReport,
  runBenchmark,
} from './benchmark.js';
export {
  formatComparisonTable,
  runSceneBenchmark,
  type SceneBenchmarkOptions,
  type SceneBenchmarkReport,
  type SceneBenchmarkResult,
} from './suite.js';
export {
  generateScenePixels,
  parseSceneUrl,
  sceneUrl,
  STANDARD_SCENES,
  type StandardScene,
} from './scenes.js';
export type {
  BenchmarkablePath,
  BenchmarkOptions,
  BenchmarkReport,
  PathBenchmarkResult,
  PathComparison,
} from './types.js';
