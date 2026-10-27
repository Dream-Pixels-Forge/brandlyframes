# @brandlyframes/cloud

## 1.1.0

### Minor Changes

- 8c90c13: feat(cloud): deploy plan, artifact-free audio concat, props by reference, warm render pool, tenant safety, preview links [BF-470, BF-472, BF-473, BF-474, BF-475, BF-300]

  - **BF-470 one-command cloud (plan/dry-run)**: `planCloudDeploy` computes the
    IAM roles, buckets and functions a deploy WOULD create (deterministic names,
    no cloud calls, no credentials) and `formatDeployPlan` prints them;
    `CLOUD_ERROR_EXPLANATIONS` + `explainCloudError` map cloud error codes to
    plain-language explanations and fixes for `cloud doctor`.
  - **BF-472 artifact-free audio concat**: `buildAudioConcatList` /
    `buildAudioConcatArgs` / `concatAudioStreams` concatenate per-chunk audio
    with the FFmpeg concat demuxer and stream copy (`-c:a copy -copyts`, exact
    frame-mapped outpoints — no re-encoding, no boundary clicks); the injectable
    spawn mirrors the renderer's mix/stitch pattern. `runAudioDriftHarness`
    replays a synthetic 10-minute timeline (18000 frames @ 30 fps) through a
    deterministic mocked clock (`createMockClock`) and measures A/V drift at
    every chunk boundary — pure computation, no real render.
  - **BF-473 large props by reference**: `createPropRef(data)` stores the payload
    in an injectable `PropRefStore` (in-memory adapter included) and returns a
    branded `PropRef` handle; `resolvePropRefs` walks props and resolves handles
    renderer-side before invoke; `estimatePropsBytes` / `assertPropsUnderLimit`
    enforce the 256 KiB inline budget (`PropSizeExceededError`).
  - **BF-474 warm render server**: `WarmRenderPool` interface with pre-launched
    workers, pre-loaded bundles, a priority queue (higher first, FIFO within),
    and `onScaleUp`/`onScaleDown` autoscaling hooks;
    `InMemoryWarmPool` is the reference mock (injectable launch/clock, no real
    browsers) with acquire/release/preloadBundle/stats/dispose.
  - **BF-475 safe multi-tenant rendering**: `validateTenantProps` entry point
    (size, JSON-safety, depth), `TenantRenderLimits` resource/time limits with
    the `networkSandbox` flag carried on every invocation, `TenantQuotaLedger`
    per-tenant concurrency + fixed-window quotas, and `MockTenantOrchestrator`
    enforcing all of it around an injected mock render (slots always released).
  - **BF-300 shareable preview links**: `buildPreviewLink` emits frame-accurate
    anchors (`#frame=123&t=4.1`, exact `frame / fps`, never rounded) and
    `parsePreviewLink` round-trips them; `PreviewCommentStore` interface with an
    `InMemoryCommentStore` adapter (frame-filtered listing, resolve flag,
    mocked-clock timestamps).

### Patch Changes

- Updated dependencies [6690012]
- Updated dependencies [efd26c7]
- Updated dependencies [a4451f5]
- Updated dependencies [46eabf7]
- Updated dependencies [5c74417]
- Updated dependencies [5f4e5e3]
- Updated dependencies [2b9c535]
- Updated dependencies [9c4ec35]
- Updated dependencies [5581e9c]
- Updated dependencies [5f0f50b]
- Updated dependencies [8d66a6a]
- Updated dependencies [6510b97]
  - @brandlyframes/renderer@1.1.0
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
  - @brandlyframes/renderer@1.0.0
