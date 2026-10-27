# @brandlyframes/renderer-webgpu

## 1.1.0

### Minor Changes

- ac71ca9: feat: add WebGPU/WebGL render path [BF-200]

  Add `@brandlyframes/renderer-webgpu` package with a GPU render path that
  bypasses Chrome screenshot capture:
  - `RenderPath` abstract interface with `ScreenshotRenderPath` and
    `GpuRenderPath` implementations
  - `GpuRenderPath` uses WebGL/WebGPU shaders when available, falling back
    to a CPU reference implementation in Node/headless environments
  - GLSL shader sources for film grain, lens distortion, bloom, blend modes,
    and LUT effects (port of `@brandlyframes/fx` to GPU)
  - All paths are deterministic: same input always yields same output
    (`frame -> pixels`)

  Tests: 15 tests covering render path abstraction, GPU/CPU fallback,
  determinism, and all five effects. Type-check, lint, and build clean.

### Patch Changes

- Updated dependencies [6690012]
- Updated dependencies [5f4e5e3]
- Updated dependencies [8d66a6a]
  - @brandlyframes/renderer@1.1.0
