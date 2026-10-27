# @brandlyframes/benchmark

## 1.1.0

### Minor Changes

- 8d66a6a: feat: add benchmark suite for render-path comparison [BF-203]

  Add `@brandlyframes/benchmark` package:
  - `comparePaths()` — benchmarks two render paths (e.g. screenshot vs GPU),
    measures speedup factor, and verifies pixel output within tolerance
  - `runBenchmark()` — benchmarks multiple paths, reports fastest/slowest,
    all-within-tolerance, and any-meets-speedup-target summary
  - `formatReport()` — human-readable text report
  - Target: GPU path ≥ 3x faster than screenshot path with output within tolerance
  - 9 unit tests covering speedup calculation, tolerance comparison, edge cases,
    and report formatting

- 7c26897: BF-240/203: golden-frame diff CLI command + CI action, 3-scene side-by-side benchmark suite (measured 61.92x vs screenshot baseline, within tolerance).

### Patch Changes

- Updated dependencies [6690012]
- Updated dependencies [5f4e5e3]
- Updated dependencies [8d66a6a]
- Updated dependencies [8d66a6a]
- Updated dependencies [ac71ca9]
  - @brandlyframes/renderer@1.1.0
  - @brandlyframes/profiler@1.1.0
  - @brandlyframes/renderer-webgpu@1.1.0
