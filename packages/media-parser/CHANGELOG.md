# @brandlyframes/media-parser

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
