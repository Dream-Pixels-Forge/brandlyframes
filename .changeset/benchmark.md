---
'@brandlyframes/benchmark': minor
---

feat: add benchmark suite for render-path comparison [BF-203]

Add `@brandlyframes/benchmark` package:
- `comparePaths()` — benchmarks two render paths (e.g. screenshot vs GPU),
  measures speedup factor, and verifies pixel output within tolerance
- `runBenchmark()` — benchmarks multiple paths, reports fastest/slowest,
  all-within-tolerance, and any-meets-speedup-target summary
- `formatReport()` — human-readable text report
- Target: GPU path ≥ 3x faster than screenshot path with output within tolerance
- 9 unit tests covering speedup calculation, tolerance comparison, edge cases,
  and report formatting
