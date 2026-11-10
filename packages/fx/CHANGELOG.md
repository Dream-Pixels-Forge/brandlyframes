# @brandlyframes/fx

## 1.3.0

### Minor Changes

- e2080dd: Add anamorphic & lens character emulation (BF-502, closes #90): `applyBokeh` (DOF with custom aperture-blade counts — circular/hexagonal/octagonal highlights), `applyHorizontalFlare` (2× scope-flare streaks), `applyFocusBreathing` (frame-driven focal shimmer), `applyVintageVignette` (corner falloff + oil-slick mottle), `applyAnamorphic` (2× squeeze/release), and a `makeLensCharacterLut` tonal grade. All pure deterministic pixel math — no GPU, no wall clock.
- 7e0cd8f: Add emotion curve driving per-frame visual treatment (BF-507, part of #91): `sampleEmotionCurve` (linear keyframed valence/arousal, clamped at ends), `emotionLut` (mood-to-LUT: contrast from arousal, color temperature from valence, anchored identity endpoints), `emotionTreatment` (LUT + camera-speed multiplier + typography weight), `applyEmotionFrame`, `emotionAtFrame`. Pure deterministic — same curve + frame → byte-identical grade.

### Patch Changes

- brandlyframes@1.3.0

## 1.2.0

### Minor Changes

- db43166: Add deterministic volumetric light & particle systems (BF-504): seeded `ParticleSystem` (snow/dust/embers), `renderParticles`, `applyGodRays` (radial light-ray bloom), and `applyVolumetricDust`. All pure pixel math — no `Math.random`, no wall clock — so preview and render match byte-for-byte.

### Patch Changes

- brandlyframes@1.2.0

## 1.1.0

### Minor Changes

- f97773c: feat: implement cinematic effects in `@brandlyframes/fx`

  Implement real, deterministic pixel-level effects (previously stubs returning strings):
  - `applyFilmGrain` — seeded per-pixel noise (monochrome / per-channel)
  - `applyLensDistortion` — radial distortion with bilinear resampling
  - `applyBloom` — threshold-extract + blur + additive glow
  - `applyBlendMode` — normal / multiply / screen / overlay with opacity
  - `loadLut` / `applyLut` — 1D color-grading lookup with linear interpolation
  - `compose` — shader-layer API that chains effects into one frame function

  All effects are pure functions over RGBA `Uint8ClampedArray` — deterministic,
  dependency-free, and safe in render workers and Node.

### Patch Changes

- Updated dependencies [efd26c7]
- Updated dependencies [a4451f5]
- Updated dependencies [46eabf7]
- Updated dependencies [5c74417]
- Updated dependencies [2b9c535]
- Updated dependencies [9c4ec35]
- Updated dependencies [5581e9c]
- Updated dependencies [5f0f50b]
- Updated dependencies [6510b97]
  - brandlyframes@1.1.0

## 1.0.0

### Major Changes

- # BrandlyFrames v1.0 — "Premiere Night"

  The first public release of BrandlyFrames, a programmatic video SDK for React. A video is a pure function of the frame number: `frame → pixels`.

  ## What's included

  **Core engine** (`brandlyframes` / `@brandlyframes/core`)
  - `registerRoot`, `<Composition>`, composition registry
  - `useCurrentFrame`, `useVideoConfig`, frame context provider
  - `<Sequence>`, `<Series>`, `<Loop>`, `<Freeze>`, `<AbsoluteFill>`
  - `interpolate`, `interpolateColors`, `Easing`, `spring`
  - `holdFrame` / `releaseFrame`, `getInputProps`, `staticFile`
  - `<Img>`, `<Audio>`, `<Video>`
  - Zod props schema + `calculateMetadata`
  - `random(seed)`, `sec()`, `ms()`, `tc()`, `useMarker()`

  **CLI** (`@brandlyframes/cli`) — `bin: brandlyframes`
  - `dev`, `build`, `export`, `create`, `render`, `still`, `compositions`
  - `frames probe | extract | cache`
  - `upgrade --check | --codemod <name>` (codemods + version-mismatch detection)
  - `doctor --fix | --json` (Node, FFmpeg, Chrome, renderer, version alignment)
  - `benchmark --concurrency <n> | --frames <n>` (auto-concurrency detection)

  **Renderer** (`@brandlyframes/renderer`)
  - Headless Chromium capture, parallel tabs, frame-range chunking
  - FFmpeg stitching: h264, h265, vp8, vp9, prores, gif, png-sequence
  - Audio mixing with volume curves
  - Transparent background and alpha output
  - Progress, cancellation, resumable chunks

  **Player** (`@brandlyframes/player`)
  - Embeddable web player with controls, loop, autoplay
  - Imperative ref API: play/pause/seekTo/getCurrentFrame/etc.
  - Frame-exact seeking without timestamp drift

  **Frame video** (`@brandlyframes/frames`)
  - `probeVideo` — rational fps, frame count, codec, color, alpha, VFR flag
  - Frame-exact timestamp mapping with rational timebase
  - FrameStore — content-hashed disk cache + LRU memory cache
  - `<FrameVideo>`: trim, playbackRate, reverse, freeze, ping-pong
  - fps conversion: exact / nearest / blend
  - VFR normalization via pts table
  - Alpha sources (VP9 alpha, ProRes 4444) and color-space handling
  - `useVideoFrame` (ImageBitmap/ImageData) and prefetch
  - `extractFrames` API

  **Plus 25+ additional packages:** bundler, studio, cloud, design, transitions, captions, shapes, paths, noise, motion-blur, three, lottie, gif, fonts, media-utils, media-parser, webcodecs, whisper, mcp, cache, audio-reactive, brand, fx, interop, test, zod-types, ai

  **Docs site** — getting started, core concepts, frame video, rendering guide, brand guide (Cinema Black design system), Remotion migration guide, API reference

  **5 templates** via `npm create brandlyframes@latest`: blank, hello-world, captions, product-promo, frame-video-demo

  ## Migration

  See the [Remotion → BrandlyFrames migration guide](/guides/migration) for a complete name-mapping table and before/after code examples.

  ## License

  MIT — free for commercial use, no render fees.

### Patch Changes

- Updated dependencies [f61922c]
- Updated dependencies
  - brandlyframes@1.0.0
