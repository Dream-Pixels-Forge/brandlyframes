# @brandlyframes/player

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

### Minor Changes

- 97498e6: v0.1 "Premiere" player phase (BF-030 to BF-032).

  - **BF-030** — `<Player>` component: embeddable web player with controls, loop, autoplay, inputProps, width/height, className/style, and event callbacks (onPlay, onPause, onFrameChange, onEnded, onError).
  - **BF-031** — Imperative ref API: play(), pause(), seekTo(frame), getCurrentFrame(), getDurationInFrames(), getPlaybackRate(), setPlaybackRate(rate), isPlaying() via forwardRef + useImperativeHandle.
  - **BF-032** — Frame-exact seeking: seekTo lands precisely on the requested 0-indexed frame without timestamp drift, across browsers. Seek-accuracy test suite added.

  Also: docs page at `/docs/player`, code examples in `docs-site/src/code-examples/player.ts`, and a changeset for the `@brandlyframes/player` package (v0.1.0 → v0.2.0).

### Patch Changes

- Updated dependencies [f61922c]
- Updated dependencies
  - brandlyframes@1.0.0
  - @brandlyframes/design@1.0.0
