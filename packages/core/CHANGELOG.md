# brandlyframes

## 1.1.0

### Minor Changes

- efd26c7: feat: add audio-reactive hooks — `useAudioData`, `useBeat`, `useLoudness`, `useSpectrum` [BF-130, BF-131, BF-132]

  Add per-frame audio hooks that are deterministic by frame: loudness (RMS), log-spaced
  spectrum bands and beat onsets derived from decoded audio. Analysis is pre-computed
  once per buffer+fps (`analyzeAudioBuffer` / `getAudioAnalysis` — an FFT-based pure
  engine, no React/DOM/network) and sampled per frame, so rendering stays a pure
  function of the frame number. Sources are injected per composition via the new
  `<AudioDataProvider sources={{ [src]: AudioBufferLike }}>`; without a provider the
  hooks return neutral values (SSR / render workers stay deterministic). Includes a
  beat-synced demo fixture whose visual lands within ±1 frame of every detected beat
  (`test/fixtures/demo/beat-demo.fixture.tsx`).

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

- 46eabf7: feat: complete core utilities (BF-400, BF-401) — add `random(seed, min, max)` (scales the same deterministic value into `[min, max)`), `randomInt` (inclusive integer range) and `randomPick` seeded helpers, plus an ESLint rule banning bare `Math.random()` in composition source (wired in the root flat config, with a lint fixture). `random(seed)`, `sec()`, `ms()`, `tc()` and `useMarker()` shipped in v1.0.0.
- 5c74417: feat: font loading that just works (BF-410) — `useFont()` now auto-holds the frame via `holdFrame()`/`releaseFrame()` until every font source resolves, so the renderer never captures a frame with a fallback font. Supports local files, Google Fonts URLs and custom font URLs; timeout (10s) names the font URLs. Works with `@brandlyframes/fonts` `FontRegistry`, `loadFont()`, `loadFonts()`, `createFontSource()`, `createSystemFontSource()` and `googleFonts`. 37 tests pass, no network in tests.
- 2b9c535: feat: add `HtmlInCanvas` component — render HTML into an offscreen `<canvas>` texture (canvas fast lane vs DOM screenshots), requires DOM and throws a helpful error outside a browser.
- 9c4ec35: fix: Node-loadable ESM dists for core, zod-types and CLI declarations

  - `brandlyframes` / `@brandlyframes/zod-types`: dist bundles via esbuild (tsc still emits declarations) — the previous extensionless ESM output could only be consumed by bundlers, which blocked the stdio MCP server and any plain-Node consumer
  - `@brandlyframes/cli`: add `./cdp-launcher` exports subpath and emit declaration files so `createCdpLauncher` can be reused by `@brandlyframes/mcp`

- 5581e9c: feat: close Remotion API gaps in `@brandlyframes/core` — add `usePixelDensity` (HiDPI device-pixel-ratio hook), `watchStaticFile` (dev asset hot-reload watcher), and `VideoForPreview`/`VideoForRendering` + `AudioForPreview`/`AudioForRendering` (preview vs rendering media variants).
- 5f0f50b: feat: close more Remotion API gaps in `@brandlyframes/core` — add bounded `MediaCache` (LRU with `maxSize`), `formatSequenceTrace`/`SequenceScope` (nested sequence stack traces), `useCurrentScale` (device-pixel scale hook) and `useIsInsideNonPremountFreeze` (freeze-scope hook via new `FreezeContext`); `<Freeze>` now provides freeze context to its subtree.
- 6510b97: feat: add `useBufferState` hook — media buffering state driven by the composition frame clock

  Add `useBufferState(mediaElement)` + `computeBufferState()` for reporting whether
  a media element is buffering and how much is buffered, driven by the frame
  clock. The pure computation is dependency-free and Node-testable; the hook
  subscribes to `progress`/`waiting`/`playing` events.

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

- f61922c: P1 core: the frame -> pixels engine of the v0.1 "Slate" release.

  - **BF-002** — `registerRoot()` bootstrap and the composition registry: `<Composition>` with unique-id / fps / dimensions validation, async `calculateMetadata` overrides, and `resolveCompositionMetadata`.
  - **BF-003** — timeline components: `<Sequence>`, `<Series>` (+ `Series.Sequence`), `<Loop>`, `<Freeze>`, `<AbsoluteFill>` with correct nested frame-offset math.
  - **BF-004** — pure timing engine under `timing/` (sequence, series, loop, freeze frame math + input validation), deterministic and React-free.
  - **BF-005** — animation utilities: `interpolate` (clamp/extend/identity extrapolation, `Easing` namespace), physics-based `spring` (with `durationInFrames` derivation), `interpolateColors` (hex/rgb/rgba/named, alpha).
  - **BF-006** — frame context: `FrameContextProvider`, `useCurrentFrame`, `useVideoConfig`, and `holdFrame()`/`releaseFrame()` async-readiness semantics.
  - **BF-007** — frame-driven media primitives: `<Img>`, `<Audio>`, `<Video>` (deterministic render trees).
  - **BF-008** — Zod props schema validation with helpful errors.
  - **BF-400** — `random(seed)`: deterministic hash-based randomness (no `Math.random` anywhere in src).
  - **BF-401** — time helpers `sec()`, `ms()`, `tc('HH:MM:SS:FF')` and `useMarker()`.

  Also: one curated public API at `packages/core/src/index.ts`, vitest line-coverage thresholds of >= 90% for `src/timing/**` and `src/animation/**`, and cross-module frame-determinism tests.
