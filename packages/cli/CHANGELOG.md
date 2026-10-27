# @brandlyframes/cli

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

- a0345d1: feat: add `brandlyframes batch` subcommand [BF-141][BF-142]

  - `brandlyframes batch <input> <outDir>` renders N variants from CSV/JSON/API input with `{{column}}` prop templating
  - Writes a batch manifest (`batch-manifest.json`) recording every variant's props, rendered URL, output dir and status
  - Crash-resume [BF-142]: a checkpoint file (`batch-checkpoint.json`) records completed variants; rerunning the same command skips them, so crashed batches resume with only the unfinished tail (`--no-resume` forces a fresh run)

- 7c26897: BF-240/203: golden-frame diff CLI command + CI action, 3-scene side-by-side benchmark suite (measured 61.92x vs screenshot baseline, within tolerance).
- 9c4ec35: fix: Node-loadable ESM dists for core, zod-types and CLI declarations

  - `brandlyframes` / `@brandlyframes/zod-types`: dist bundles via esbuild (tsc still emits declarations) — the previous extensionless ESM output could only be consumed by bundlers, which blocked the stdio MCP server and any plain-Node consumer
  - `@brandlyframes/cli`: add `./cdp-launcher` exports subpath and emit declaration files so `createCdpLauncher` can be reused by `@brandlyframes/mcp`

### Patch Changes

- 8d66a6a: feat: add `--log verbose` slow-frame report to `render` command [BF-424]

  - `brandlyframes render --log verbose` now prints a slow-frame report after every render
  - Reports average ms/frame, slow frames (>33 ms), and the top 5 slowest frames
  - Basic version of the P14 frame profiler

- 8d66a6a: feat: `doctor --fix` auto-fixes environment issues [BF-430]

  - `ffmpeg` check is now fixable: installs via apt/brew/winget
  - `chrome` check is now fixable: installs via apt/brew/winget
  - `versions` check actually aligns all `@brandlyframes/*` package versions to the CLI version
  - Reports fixed status and exits 0 when all issues resolved

- Updated dependencies [8d66a6a]
- Updated dependencies [6690012]
- Updated dependencies [7c26897]
- Updated dependencies [5f4e5e3]
- Updated dependencies [8d66a6a]
- Updated dependencies [ac71ca9]
  - @brandlyframes/benchmark@1.1.0
  - @brandlyframes/renderer@1.1.0
  - @brandlyframes/test@1.1.0
  - @brandlyframes/renderer-webgpu@1.1.0

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

- Updated dependencies
  - @brandlyframes/renderer@1.0.0
