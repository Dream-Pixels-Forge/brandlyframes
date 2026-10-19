---
'@brandlyframes/frames': minor
---

**BF-061** — frame-counter test clips and 4K/60 perf benchmark

Add `TEST_CLIPS` (CFR, VFR, alpha, and 4K/60 perf clip specs) plus the
test-clip generator utilities:

- `generateFrameCounterText(frameIndex, totalFrames, fps)` — burned-in frame
  counter text with elapsed time
- `createFrameCounterFrame(spec, frameIndex)` — synthetic RGB/RGBA frame with
  frame counter, deterministic for a given spec + frame index
- `generateTestClipManifest()` / `writeTestClipManifest(outputDir)` — manifest
  JSON of all predefined clips
- `runPerfBenchmark(clipSpec)` — frame decode/encode perf benchmark result

See the new **Test Clips** docs page for usage examples.
