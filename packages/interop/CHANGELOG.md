# @brandlyframes/interop

## 1.1.0

### Minor Changes

- 92a34ae: feat: HyperFrames HTML import + OTIO/EDL/FCP XML export [BF-230][BF-231]

  - `parseHyperFramesHtml` (BF-230): parse HyperFrames composition documents
    into BrandlyFrames composition IR — data-* timing attributes
    (`data-start-frame`, `data-duration-frames`, `data-track`), clip classes
    (`hf-clip`, `hf-video`, `hf-audio`, `hf-image`, `hf-text`), track
    containers (`hf-track`/`data-track-name`), markers (`hf-marker`), and
    composition config (`data-fps`/`data-width`/`data-height`/
    `data-duration-frames`). Unknown nodes become `<Sequence>` placeholders
    with warnings; malformed HTML never throws.
  - `exportOtio`/`parseOtio` (BF-231): OpenTimelineIO JSON with Gap fillers
    and `metadata.brandlyframes` — lossless round trip of our own exports.
  - `exportEdl`/`parseEdl` (BF-231): CMX3600 EDL with V/A cut events and
    `* FROM CLIP NAME:` comments; documented-lossy (no markers/media/track
    names, fps supplied at parse time).
  - `exportFcpXml`/`parseFcpXml` (BF-231): xmeml v4 with clipitem in/out/
    start/end, pathurl media references and sequence markers; documented
    lossy fields in the package README.
  - Composition IR types (`CompositionIR`, `TimelineClip`, `TimelineTrack`,
    `TimelineMarker`) and `validateComposition`; the placeholder stub API
    was replaced (no consumers). Package is now dependency-free.

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
  - @brandlyframes/zod-types@1.0.0
