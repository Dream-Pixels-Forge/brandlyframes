# @brandlyframes/aspect

## 1.1.0

### Minor Changes

- 8d66a6a: feat: add aspect-ratio presets with auto-reframe [BF-212]

  Add `@brandlyframes/aspect` package:
  - Four cinema-standard presets: 2.39:1, 16:9, 9:16, 1:1 with title-safe and action-safe areas
  - `autoReframe()` — computes crop box to keep a subject centered when reframing to a target ratio
  - `fitToPreset()` — cover/contain/fit scaling with letterbox calculation
  - `useAspectPreset()` React hook
  - Deterministic: pure functions of input dimensions, no Math.random, no Date.now
  - 15 unit tests covering presets, safe areas, auto-reframe centering, fit modes, edge cases
