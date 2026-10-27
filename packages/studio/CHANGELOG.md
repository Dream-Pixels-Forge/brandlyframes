# @brandlyframes/studio

## 1.1.0

### Minor Changes

- 6690012: feat: content-addressed frame/layer cache [BF-110][BF-111][BF-112]

  - `@brandlyframes/cache`: `canonicalJson` + `frameCacheKey` — stable SHA-256
    keys over canonical JSON of (composition config + props + frame + render
    params); pluggable `CacheStore` interface with an fs store (`FsStore`) and
    S3/GCS interface stubs (`S3Store`/`GcsStore`); `ContentCache` with
    hit/miss counters and `getOrCompute`.
  - `@brandlyframes/renderer`: `runRenderJob` accepts `cacheDir` to reuse
    frames across identical renders and reports `cacheHits` / `cacheMisses`.
  - `@brandlyframes/cli`: `brandlyframes render --cache <dir>` enables the
    frame cache and prints hit/miss counters with hit rate.
  - `@brandlyframes/studio`: `CacheCounters` component surfaces cache stats.

- 5446159: BF-120/121/122: visual timeline (clips, trim, markers, playhead scrub), keyframe/curve editor with bezier/spring preview, and Babel AST write-back with lossless round-trip tests.
- a4451f5: feat: live mode + template gallery & no-code props form [BF-303][BF-481]

  - `@brandlyframes/studio/live` (Node-only subpath): live mode for real-time
    broadcast overlays — `LiveServer` ticks a composition on a wall-time
    deterministic clock (frames derived from absolute wall time, never
    integrated from ticks; ticks scheduled on the absolute frame grid, so
    60 fps for an hour accumulates zero drift — validated with an accelerated
    mocked clock over a simulated hour, 216,000 tick broadcasts, exact at
    every point). `HttpLiveTransport` is the local HTTP/WebSocket browser-source
    endpoint (Cinema Black overlay page + RFC 6455 frame pushes); NDI/WebRTC
    adapters implement the same injectable `LiveTransport` interface (mock
    transport in tests).
  - `@brandlyframes/studio`: `TemplateGallery` browses the core template
    registry (injectable `GalleryRegistry`; default adapter
    `coreTemplateGalleryRegistry`), with preview thumbnails and a use-template
    flow, and `NoCodePropsForm` renders a template's Zod `propsSchema` as a
    fillable, validated form (string/number/boolean/enum inputs, JSON fallback)
    with a render-from-form action.
  - `brandlyframes`: new `brandlyframes/template-registry` subpath export
    exposing the existing BF-302 template registry (`registerTemplate`,
    `getTemplate`, `listTemplates`, `clearTemplates`) so host apps and the
    studio gallery can consume it.

- 3ca2b83: feat: add studio debugging tools [BF-411, BF-412, BF-241]

  - BF-411 error overlay: `ErrorCapture` records render errors with failing component name, frame number and props snapshot; `suggestFix()` maps common React/JS error messages to best-effort fixes; `extractComponentName()` parses component/error stacks. `ErrorOverlay` now renders component name, props snapshot and suggested fix.
  - BF-412 frame inspector: click any element in the preview -> panel shows computed props/styles at the current frame. `resolveElementProps()` walks React fibers (`__reactFiber$`/`__reactProps$`), `InspectorRegistry` allows explicit element->props registration, `getElementStyles()` snapshots computed styles, `useFrameInspector()` wires preview clicks to the panel.
  - BF-241 time-travel debugger: `FrameHistory` ring buffer of already-rendered frames with cursor-based back/forward scrubbing (no re-render) and `jump()`; `TimeTravelDebugger` adds back/forward buttons and jump-to-first-error-frame (from `ErrorCapture.firstErrorFrame`).

  Unit tests (66 total, jsdom) cover error capture, inspector registry/fiber walk, and the history ring buffer.

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
  - @brandlyframes/design@1.1.0

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
  - @brandlyframes/design@1.0.0
