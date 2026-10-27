# @brandlyframes/mcp

## 1.1.0

### Minor Changes

- 9c4ec35: feat: real MCP tool implementations over renderer/CLI internals, JSON Schema export, stdio bin, e2e agent test [BF-100, BF-101, BF-103]

  - Wire all 7 tools to real implementations: `list_compositions` / `read_composition_props` read the core composition registry; `edit_composition_props` validates against the composition's Zod schema (`validateCompositionProps`) with a brand-kit fallback (`validateBrandKit`); `render_still` uses `captureFrame` + the CLI CDP launcher; `render_video` runs `runRenderJob` + `stitchFrames` (capture mode) or `stitchFrames` only (ffmpeg stitch mode); `read_render_status` tracks live job progress
  - `propsJsonSchema()` derives JSON Schema from Zod prop schemas via `z.toJSONSchema` (Zod 4, matching core); tool inputs are JSON-Schema-typed from Zod
  - `brandlyframes-mcp` stdio bin (`--entry <module>` imports a registration module before serving); `connect()` for in-process transports
  - Injectable `McpServerDeps` (captureStill / renderJob / stitch / launcher) mirroring the renderer's injectable patterns
  - In-process MCP client contract tests (15) + brief-to-MP4 e2e test that renders a real h264 MP4 via ffmpeg and skips when ffmpeg is missing [BF-103]
  - Align on zod ^4.6.7 (core's zod major); drop unused react peerDep

- 8d66a6a: feat: complete MCP server with all 7 tools + JSON Schema [BF-100]

  Add to `@brandlyframes/mcp`:
  - `inspect_timeline` tool — inspect timeline structure (sequences, series, loops, frame ranges)
  - `read_render_status` tool — check render job status (id, status, progress, output URL, error)
  - `registerRenderJob()` — register render job progress from the renderer/CLI
  - `compositionJsonSchema` — machine-readable JSON Schema derived from Zod for agent prop validation
  - All 7 MCP tools: list_compositions, read_composition_props, edit_composition_props, render_still, render_video, inspect_timeline, read_render_status
  - Unit tests covering schema and server

### Patch Changes

- Updated dependencies [6690012]
- Updated dependencies [efd26c7]
- Updated dependencies [a0345d1]
- Updated dependencies [7c26897]
- Updated dependencies [a4451f5]
- Updated dependencies [46eabf7]
- Updated dependencies [5c74417]
- Updated dependencies [5f4e5e3]
- Updated dependencies [8d66a6a]
- Updated dependencies [8d66a6a]
- Updated dependencies [2b9c535]
- Updated dependencies [9c4ec35]
- Updated dependencies [5581e9c]
- Updated dependencies [5f0f50b]
- Updated dependencies [8d66a6a]
- Updated dependencies [6510b97]
  - @brandlyframes/renderer@1.1.0
  - @brandlyframes/cli@1.1.0
  - brandlyframes@1.1.0
  - @brandlyframes/zod-types@1.1.0

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
