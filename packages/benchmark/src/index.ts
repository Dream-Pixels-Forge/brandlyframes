/**
 * @brandlyframes/benchmark — benchmark suite [BF-203]
 *
 * Compares render paths, measures speedup, and verifies output within
 * tolerance. Target: GPU path ≥ 3x faster than screenshot path.
 */

export {
  comparePaths,
  formatReport,
  runBenchmark,
} from './benchmark.js';
export type {
  BenchmarkablePath,
  BenchmarkOptions,
  BenchmarkReport,
  PathBenchmarkResult,
  PathComparison,
} from './types.js';
