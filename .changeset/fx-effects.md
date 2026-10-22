---
'@brandlyframes/fx': minor
---

feat: implement cinematic effects in `@brandlyframes/fx`

Implement real, deterministic pixel-level effects (previously stubs returning strings):
- `applyFilmGrain` — seeded per-pixel noise (monochrome / per-channel)
- `applyLensDistortion` — radial distortion with bilinear resampling
- `applyBloom` — threshold-extract + blur + additive glow
- `applyBlendMode` — normal / multiply / screen / overlay with opacity
- `loadLut` / `applyLut` — 1D color-grading lookup with linear interpolation
- `compose` — shader-layer API that chains effects into one frame function

All effects are pure functions over RGBA `Uint8ClampedArray` — deterministic,
dependency-free, and safe in render workers and Node.
