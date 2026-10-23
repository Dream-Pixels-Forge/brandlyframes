---
'@brandlyframes/profiler': minor
---

feat: add frame profiler with slow-frame report and flame-view data [BF-202]

Add `@brandlyframes/profiler` package:
- `FrameProfiler` wraps any render path and records per-frame render timing
- Identifies slow frames (configurable threshold) and slow components
- Produces flame-view data points for the Studio flame chart
- Deterministic: no `Math.random`, no wall-clock dependence beyond timing
- 7 unit tests covering timing recording, slow-frame detection, component aggregation, flame-view output, and clear/reset
