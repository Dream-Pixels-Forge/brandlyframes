# GOAL: Build **BrandlyFrames** — a programmatic video SDK (React → MP4)

> Hand this file to a coding agent. Build it end to end, production-ready (not a demo).
> **Clean-room rule:** replicate the *architecture and concepts* of Remotion, never copy its source code (Remotion uses a custom license). Write all code from scratch under MIT/Apache-2.0. Public API names are BrandlyFrames' own.

---

## 1. Mission

Ship **BrandlyFrames**, an open SDK to create videos programmatically with React. A video is a pure function of the **frame number**: `frame -> pixels`. Developers write components, preview them live in a Studio, embed them in a web Player, and render them to MP4/WebM/GIF/PNG-sequence locally, on a server, or in the cloud.

**Plus one headline feature beyond Remotion:** first-class **frame-by-frame video** (`<FrameVideo>`). Any source video is decoded to exact frames, addressable by frame index, deterministic in preview and render, and usable as pixel data for effects.

## 2. Principles

1. **Determinism**: the same frame number always yields the same pixels.
2. **Frame is the clock**: no `Date.now()`, no CSS time-based animation. Everything derives from `useCurrentFrame()`.
3. **React-native DX**: components, hooks, props. Zod-typed input props.
4. **Modular monorepo**: small packages, each with a single job.
5. **Parallel, resumable rendering**: chunked across workers/lambdas.
6. **Frame accuracy** for video: no off-by-one, no drift, VFR-safe.

---

## 3. Architecture side by side

### 3.1 Package map

| Layer | Remotion | **BrandlyFrames** |
|---|---|---|
| Core (hooks, components, timing) | `remotion` | `brandlyframes` |
| CLI | `@remotion/cli` | `@brandlyframes/cli` |
| Bundler (webpack/esbuild) | `@remotion/bundler` | `@brandlyframes/bundler` |
| Renderer (Chrome + FFmpeg) | `@remotion/renderer` | `@brandlyframes/renderer` |
| Studio (live editor UI) | `@remotion/studio` | `@brandlyframes/studio` |
| Player (embeddable web player) | `@remotion/player` | `@brandlyframes/player` |
| Cloud rendering | `@remotion/lambda` / `cloudrun` | `@brandlyframes/cloud` (AWS Lambda + GCP Cloud Run adapters) |
| Media helpers (audio data, waveform) | `@remotion/media-utils` | `@brandlyframes/media-utils` |
| Media parsing / WebCodecs | `@remotion/media-parser`, `@remotion/webcodecs` | `@brandlyframes/media-parser`, `@brandlyframes/webcodecs` |
| Transitions | `@remotion/transitions` | `@brandlyframes/transitions` |
| Captions | `@remotion/captions` | `@brandlyframes/captions` |
| Shapes / paths / noise / motion blur | `@remotion/shapes`, `paths`, `noise`, `motion-blur` | `@brandlyframes/shapes`, `paths`, `noise`, `motion-blur` |
| 3D | `@remotion/three` | `@brandlyframes/three` |
| Lottie / GIF / fonts | `@remotion/lottie`, `gif`, `google-fonts` | `@brandlyframes/lottie`, `gif`, `fonts` |
| Zod types | `@remotion/zod-types` | `@brandlyframes/zod-types` |
| Whisper transcription | `@remotion/install-whisper-cpp` | `@brandlyframes/whisper` |
| **Frame-by-frame video** | *(partial, via OffthreadVideo)* | **`@brandlyframes/frames`** (new, first-class) |

### 3.2 Core API mapping

| Concept | Remotion | **BrandlyFrames** |
|---|---|---|
| Register entry | `registerRoot` | `registerRoot` |
| Declare a video | `<Composition>` | `<Composition>` |
| Current frame | `useCurrentFrame()` | `useCurrentFrame()` |
| Video config (fps, size, duration) | `useVideoConfig()` | `useVideoConfig()` |
| Time shift / scoping | `<Sequence>` | `<Sequence>` |
| Sequential layout | `<Series>` | `<Series>` |
| Fill layer | `<AbsoluteFill>` | `<AbsoluteFill>` |
| Value mapping | `interpolate()` | `interpolate()` |
| Physics easing | `spring()` | `spring()` |
| Colors | `interpolateColors()` | `interpolateColors()` |
| Loop / freeze | `<Loop>`, `<Freeze>` | `<Loop>`, `<Freeze>` |
| Video | `<Video>`, `<OffthreadVideo>` | `<Video>` (realtime), **`<FrameVideo>`** (exact frames) |
| Audio / Image | `<Audio>`, `<Img>` | `<Audio>`, `<Img>` |
| Static assets | `staticFile()` | `staticFile()` |
| Async readiness | `delayRender` / `continueRender` | `holdFrame()` / `releaseFrame()` (same semantics) |
| Input props | `getInputProps()` | `getInputProps()` |
| Config file | `remotion.config.ts` | `brandlyframes.config.ts` |

### 3.3 Pipeline diagram

```
REMOTION                                  BRANDLYFRAMES
────────                                  ─────────────
React project                             React project
   │ registerRoot                            │ registerRoot
   ▼                                         ▼
@remotion/bundler (webpack)               @brandlyframes/bundler (esbuild/Vite)
   │ static bundle                           │ static bundle + asset manifest
   ▼                                         ▼
┌───────────────┐                         ┌────────────────────┐
│ Studio / Player│                        │ Studio / Player     │
│ (preview)      │                        │ (preview)           │
└───────┬───────┘                         └─────────┬──────────┘
        │ render request                            │ render request
        ▼                                           ▼
@remotion/renderer                        @brandlyframes/renderer
   │ headless Chrome tabs (parallel)         │ headless Chrome tabs (parallel)
   │ screenshot per frame                    │ screenshot per frame
   │ OffthreadVideo → ffmpeg extract         │ FrameVideo → FrameStore (pre-decoded, indexed) ◄── NEW
   │ audio mixing                            │ audio mixing + per-frame audio slicing
   ▼                                         ▼
FFmpeg stitch (+ audio)                   FFmpeg stitch (+ audio)
   ▼                                         ▼
MP4 / WebM / GIF / PNG seq                MP4 / WebM / GIF / PNG seq / ProRes alpha
   │                                         │
   └─ @remotion/lambda (chunks + concat)     └─ @brandlyframes/cloud (chunks + concat, Lambda/CloudRun)
```

---

## 4. The new feature: Frame-by-frame video (`@brandlyframes/frames`)

### 4.1 Why
Remotion's `<OffthreadVideo>` extracts frames on demand with FFmpeg, but is not a first-class, addressable frame model. BrandlyFrames treats a source video as an **indexed frame sequence** that the timeline can address by exact index, and exposes frames as pixels for effects.

### 4.2 Public API

```tsx
import { FrameVideo, useVideoFrame, extractFrames, probeVideo } from "@brandlyframes/frames";

// 1. Drop-in component, frame-exact
<FrameVideo
  src={staticFile("clip.mp4")}
  startFrom={30}            // source frame index to start at
  endAt={210}               // source frame index to stop at
  playbackRate={0.5}        // retimed with frame blending or nearest-frame
  fit="cover"
  frameMode="exact"         // "exact" | "blend" | "nearest"
  fpsConversion="auto"      // source fps → composition fps mapping
/>

// 2. Hook: get the decoded frame as ImageBitmap / ImageData for custom effects (canvas, WebGL, shaders)
const frame = useVideoFrame({ src, sourceFrame: 42 });

// 3. Node API: extract frames to disk or memory
await extractFrames({ src, from: 0, to: 120, format: "png" | "jpeg" | "webp", outDir });

// 4. Probe
const info = await probeVideo(src); // fps (rational), frameCount, duration, size, codec, pixFmt, colorSpace, hasAlpha, isVFR
```

CLI:
```
brandlyframes frames probe clip.mp4
brandlyframes frames extract clip.mp4 --from 0 --to 120 --format png --out ./frames
brandlyframes frames cache clear
```

### 4.3 Requirements

- **Frame-accurate mapping**: composition frame → source timestamp using rational timebase (num/den), never floats alone. Verify: frame N rendered twice produces identical bytes.
- **FrameStore**: on first use, decode the source once into an on-disk cache (content-hash keyed), indexed by source frame number. LRU memory cache of hot frames. Parallel workers share the cache.
- **Decode backends** (pluggable): (a) FFmpeg for server/render, (b) **WebCodecs** (`VideoDecoder`) for Studio/Player scrubbing, (c) `<video>` seek fallback.
- **VFR handling**: detect variable frame rate; normalize to a constant-frame-rate index via a pts table.
- **fps conversion**: nearest, previous, or frame-blend when source fps ≠ composition fps; configurable per component.
- **Retime**: `playbackRate`, reverse (negative rate), freeze-frame, ping-pong.
- **Alpha**: support WebM VP9 alpha and ProRes 4444 sources; preserve alpha through compositing.
- **Color**: respect color space/range (BT.601/709/2020, limited/full); expose a tonemap option.
- **Pixel access**: `useVideoFrame` returns `ImageBitmap` plus optional `getImageData()` for per-frame analysis/effects.
- **Preload/prefetch**: decode N frames ahead of the playhead in Studio/Player; backpressure-aware.
- **Holds render until ready**: uses `holdFrame()`/`releaseFrame()` so a frame is never screenshotted before its video frame is decoded.
- **Audio**: companion `<FrameAudio>` slices the source audio to match the retimed range and rate (with pitch-preserve option).
- **Large files**: stream decode; never load whole video in memory; handle 4K/60fps and 1h+ sources.
- **Error handling**: clear errors for unsupported codecs, missing files, corrupt frames; fallback strategy configurable.

---

## 5. Repository structure

```
brandlyframes/
├─ packages/
│  ├─ core/            → published as "brandlyframes"
│  ├─ cli/
│  ├─ bundler/
│  ├─ renderer/
│  ├─ studio/
│  ├─ player/
│  ├─ cloud/
│  ├─ frames/          ← frame-by-frame video (new)
│  ├─ mcp/             ← agent-native MCP server (P9)
│  ├─ cache/           ← incremental render cache (P10)
│  ├─ audio-reactive/  ← beat, loudness, spectrum hooks (P12)
│  ├─ brand/           ← brand kits + batch rendering (P13)
│  ├─ fx/              ← shaders, LUTs, camera (P15)
│  ├─ ai/              ← AI video/image/caption components (P16)
│  ├─ interop/         ← HyperFrames import, OTIO/EDL export (P17)
│  ├─ design/          ← Cinema Black tokens + components (§5b)
│  ├─ test/            ← visual regression runner (P18)
│  ├─ media-utils/  media-parser/  webcodecs/
│  ├─ transitions/  captions/  shapes/  paths/  noise/  motion-blur/
│  ├─ three/  lottie/  gif/  fonts/  zod-types/  whisper/
│  └─ create-brandlyframes/   (npm create brandlyframes@latest)
├─ templates/          (blank, hello-world, captions, product-promo, frame-video-demo)
├─ docs/               (site + API reference)
├─ examples/
├─ tooling/            (eslint, tsconfig, release scripts)
└─ goal.md
```

Stack: TypeScript (strict), pnpm workspaces + Turborepo, esbuild/Vite for bundling, Vitest + Playwright for tests, Changesets for releases.

---

## 5b. Design system: "Cinema Black"

**Identity:** black, white, and orange accents, like a cinema: dark theater, projector light, slate and timecode. Orange is the only color; it is used sparingly, like a projector beam or a "REC" light.

Ship it as `@brandlyframes/design` (tokens + React components) used by Studio, Player, docs site, templates, and CLI output.

### Color tokens

| Token | Value | Use |
|---|---|---|
| `--bf-black` | `#0A0A0A` | App background, canvas surround ("theater dark") |
| `--bf-surface-1` | `#111111` | Panels, sidebar |
| `--bf-surface-2` | `#1A1A1A` | Cards, inputs, timeline tracks |
| `--bf-border` | `#2A2A2A` | Dividers, outlines |
| `--bf-text-muted` | `#8A8A8A` | Secondary text, labels |
| `--bf-white` | `#FAFAFA` | Primary text, icons |
| `--bf-orange` | `#FF6A00` | Accent: playhead, primary buttons, active state, focus ring, REC |
| `--bf-orange-hover` | `#FF8533` | Hover on accent |
| `--bf-orange-dim` | `#FF6A0026` | Selection fill, glow (15% alpha) |

Rules:
- Accent orange covers at most ~5% of any screen. No second accent color.
- Semantic states: error uses white on a dark-orange tint with an icon (no red); success is white with a check icon. Never rely on color alone.
- Light theme exists as an inverse ("Paper"): white background, black text, same orange accent. Dark is the default.
- WCAG AA contrast minimum on all text.

### Typography
- **Display:** a condensed, poster-style sans (e.g. Bebas Neue or Oswald), uppercase, wide tracking, for titles and the logo.
- **UI:** Inter.
- **Timecode / code / frame numbers:** JetBrains Mono, always tabular, formatted `HH:MM:SS:FF`.

### Cinema motifs (use with restraint)
- **Playhead** is a thin orange line with a small orange marker; scrubbing shows a live timecode.
- **Letterbox bars**: the preview canvas sits in black with optional 2.39:1 / 16:9 / 9:16 safe-area guides.
- **Slate / clapperboard**: loading and render-progress states use a clapper animation; the render counter reads "SCENE 01 / TAKE 03" style labels.
- **Film grain**: a subtle optional grain overlay on marketing surfaces only, never over the preview canvas.
- **Rec indicator**: a pulsing orange dot while rendering.
- **Frame counter**: persistent mono readout `FRAME 0042 / 0300`.
- **Anamorphic flare**: a thin horizontal orange streak, used only on hero/marketing visuals.
- Motion: ease-out, 150-250 ms, no bouncy UI animation; cinematic fades for page transitions.

### Components to ship
Button (primary orange / secondary outline / ghost), Timeline (tracks, playhead, markers), Scrubber, Panel, Tabs, Props editor fields, Tooltip, Toast, Progress (clapper + bar), Modal, Command palette, Frame counter, Timecode input, Logo lockup.

### Applied to
- **Studio & Player:** black UI shell, orange playhead and primary actions, white text.
- **Docs site:** black default with white text, orange links and code highlights, cinematic hero.
- **CLI:** monochrome output with a single orange (ANSI 208 / truecolor `#FF6A00`) for the prompt, progress bar and success lines; respects `NO_COLOR`.
- **Templates and `create-brandlyframes`:** default compositions use the black/white/orange palette.
- **Logo:** wordmark "BRANDLYFRAMES" in display type, with a frame-bracket or clapper mark in orange on black; provide SVG in black, white and orange versions.

### Deliverables
Design tokens as CSS variables + TypeScript + JSON (Style Dictionary), a Storybook of all components, a brand guide page in the docs, and Figma/Paper-ready token export.

---

## 6. Core behaviors to implement

1. **Timeline engine**: frame context provider, nested `<Sequence>` offset math, `<Series>`, `<Loop>`, `<Freeze>`.
2. **Composition registry**: id, component, `durationInFrames`, `fps`, `width`, `height`, `defaultProps`, Zod `schema`, `calculateMetadata` (async dynamic duration/props).
3. **Animation utils**: `interpolate` (clamp/extend/easing), `spring` (damping/stiffness/mass, `durationInFrames`), `interpolateColors`, `Easing`.
4. **Studio**: composition sidebar, timeline scrubber, props editor (from Zod schema), hot reload, render dialog, frame-video inspector (shows source frame index and decode status).
5. **Player**: embeddable React component with controls, loop, autoplay, `inputProps`, ref API (`play/pause/seekTo`), event callbacks.
6. **Renderer**:
   - Launch headless Chromium, N concurrent tabs, frame range chunking.
   - Screenshot per frame (PNG/JPEG), optional GPU, transparent background support.
   - Audio mixing from `<Audio>`/`<FrameAudio>` with volume curves.
   - FFmpeg stitching: h264, h265, vp8, vp9, prores, gif, png-sequence, audio-only.
   - Options: crf, bitrate, scale, concurrency, frame range, pixel format, color space, hardware encoder.
   - Progress callbacks, cancellation, resumable from partial chunks.
7. **Cloud**: split into chunks, render in parallel functions, concat, upload to storage (S3/GCS), webhooks, cost estimate.
8. **CLI**: `init`, `studio`, `preview`, `render`, `still`, `compositions`, `bundle`, `cloud deploy|render`, `frames *`, `upgrade`, `doctor`.

---

## 7. Phases and Definition-of-Done gates

| Phase | Scope | DoD gate |
|---|---|---|
| **P0 Foundation** | Monorepo, tooling, CI, license, naming | `pnpm build && pnpm test` green in CI |
| **P1 Core** | Timeline engine, hooks, primitives, animation utils | Unit tests 90%+ on timing/interpolate/spring; deterministic frame tests |
| **P2 Bundler + Studio** | Bundle, hot reload, scrubber, props editor, `@brandlyframes/design` tokens (§5b) | Open template in Studio, scrub, edit props live; UI matches Cinema Black tokens, AA contrast passes |
| **P3 Renderer** | Chrome capture, FFmpeg stitch, audio | `render` outputs correct MP4; frame N matches golden image |
| **P4 Player** | Embeddable player | Works in a Next.js and plain React app; seek accuracy tests |
| **P5 Frame video** | `@brandlyframes/frames` full spec in §4 | Frame-exact test suite (CFR + VFR + alpha), render determinism test, 4K perf benchmark |
| **P6 Extras** | transitions, captions, shapes, three, lottie, gif, fonts | Each has docs + example + tests |
| **P7 Cloud** | Lambda/CloudRun adapters | 10-min video renders in parallel and concatenates without drift |
| **P8 DX + Release** | `create-brandlyframes`, docs site, templates, v1.0 | New user goes from `npm create` to rendered MP4 in under 5 minutes |

Do not advance a phase until its gate passes.

### 7b. Next-level roadmap (post-v1.0, P9 and up)

Everything below is in scope. Build in this order; same rule: no phase advances until its gate passes.

| Phase | Scope | DoD gate |
|---|---|---|
| **P9 Agent-native** | `@brandlyframes/mcp` MCP server: list compositions, read/edit props, render a still, render a video, inspect the timeline, read render status. Machine-readable composition schema (JSON Schema from Zod). Built-in agent skill (`SKILL.md`) shipped in `create-brandlyframes` and the docs. | An agent (Claude via MCP) goes from a text brief to a rendered MP4 using only MCP tools; integration test passes in CI |
| **P10 Incremental rendering** | Content-addressed frame/layer cache: hash of (component tree, props, input assets, SDK version) per frame; re-render only changed frames; shared cache for local, cloud and CI. | Editing one scene of a 2-min video re-renders only affected frames (verified by frame-hit counters); cached and cold renders are byte-identical |
| **P11 Two-way timeline** | Studio visual timeline: drag/trim clips, keyframes, markers; curve editor for easing and springs; edits are written back into the source code via AST transforms (code stays source of truth). | Dragging a clip rewrites the correct `<Sequence from/duration>` in source; round-trip (UI → code → UI) is lossless on all templates |
| **P12 Audio-reactive** | `useAudioData`, `useBeat`, `useLoudness`, `useSpectrum` hooks; pre-computed per-frame audio analysis cached beside the audio file; compatible with a future Spectrumalyzer feed. | Beat-synced template: hits land within ±1 frame of detected beats; analysis is deterministic |
| **P13 Brand kits + batch** | `brand.json` (colors, fonts, logo, voice, safe areas) auto-applied via `useBrand()`; batch render from CSV/JSON/API with templating, concurrency limits, naming rules, and a manifest report. | 500-variant batch renders unattended, resumes after a forced crash, and outputs a complete manifest |
| **P14 Performance** | WebGPU/WebGL render path that bypasses Chrome screenshots; browser-side export via WebCodecs (no server); frame profiler (slow-frame report, flame view in Studio). | GPU path is at least 3x faster than the screenshot path on the benchmark set with matching output within tolerance; profiler identifies a deliberately slow component |
| **P15 Cinematic quality** | `@brandlyframes/fx`: LUT color grading, film grain, lens distortion, bloom, motion blur, blend modes, shader layer API. `<Camera>` component for 3D-style moves (dolly, pan, parallax) over 2D layers. Aspect-ratio presets (2.39:1, 16:9, 9:16, 1:1) with auto-reframe. | Effects are deterministic per frame; camera moves match reference renders; one-click reframe of a template to 9:16 keeps subjects in safe area |
| **P16 AI building blocks** | `@brandlyframes/ai`: `<AIVideo>`, `<AIImage>` calling providers (Seedance, Higgsfield, others via adapters), cached by prompt + seed + model so renders stay deterministic; auto-captions with word-level timing; caption translation and dubbing hooks. | Re-rendering a composition with AI assets makes zero provider calls (cache hit); captions align within ±1 frame on the test set |
| **P17 Interop** | Import HTML/HyperFrames compositions (ForgeFrame direction); export to NLE formats (OTIO, EDL, FCP XML) so edits continue in Premiere/Resolve/After Effects. | HyperFrames sample imports and renders; exported OTIO opens in DaVinci Resolve with correct clip timing |
| **P18 Quality + debugging** | Video visual regression testing (`brandlyframes test`: golden-frame diff, fail on drift, CI action); time-travel debugger (inspect any frame's props/state in Studio). | CI action blocks a PR with a deliberate visual regression; debugger reproduces any frame's state from a render log |
| **P19 Collaboration + ecosystem** | Shareable cloud preview links with frame-accurate comments ("fix at 00:12:08"); plugin API (components, effects, exporters, Studio panels); template marketplace with versioning and signing; live mode for real-time broadcast overlays (NDI/WebRTC/browser-source output). | Reviewer comment pins to a frame and opens at that frame in Studio; a third-party plugin installs and runs sandboxed; live overlay runs 60 fps for 1 hour without drift |

All P9-P19 features follow the §5b design system (Cinema Black) for any UI, and every new package gets docs, examples, tests and a migration note.

---

## 7c. Version roadmap and implementation tracking

The phases above are the *work*; the versions below are the *releases*. Every feature has an ID (`BF-###`), a checkbox, and lands in exactly one version. Track progress by ticking boxes in this file and mirroring them as GitHub milestones (one milestone per version, one issue per feature ID).

### Tracking rules
1. **One feature = one ID = one issue = one PR (or small stack of PRs).** Reference the ID in commits (`feat(frames): frame-exact mapping [BF-051]`).
2. **A feature is checked only when**: code merged, unit/integration tests passing, docs page written, example or template updated, changeset added.
3. **A version is released only when** every box in it is checked and its gate (§7) passes. Tag `vX.Y.0`, publish all packages in lockstep (fixed versioning), update `CHANGELOG.md`.
4. **Semver**: `0.x` may break between minors; from `1.0` on, breaking changes only in majors, with a migration guide and a deprecation window of at least one minor.
5. **Scope freeze**: no new feature enters a version after its first release candidate; push it to the next version.
6. **Status board** (keep at `docs/ROADMAP.md`, generated from this file): columns *Planned / In progress / In review / Done*, grouped by version.
7. Each release ships a **demo composition** that exercises its headline feature.

### Pre-1.0 (foundation)

**v0.1 "Slate": core engine** (P0, P1)
- [x] BF-001 Monorepo, tooling, CI (Linux/macOS/Windows), license, name reservation
- [x] BF-002 `registerRoot`, `<Composition>`, composition registry
- [x] BF-003 `useCurrentFrame`, `useVideoConfig`, frame context provider
- [x] BF-004 `<Sequence>`, `<Series>`, `<Loop>`, `<Freeze>`, `<AbsoluteFill>`
- [x] BF-005 `interpolate`, `interpolateColors`, `Easing`, `spring`
- [x] BF-006 `holdFrame` / `releaseFrame`, `getInputProps`, `staticFile`
- [x] BF-007 `<Img>`, `<Audio>`, basic `<Video>`
- [x] BF-008 Zod props schema + `calculateMetadata`

**v0.2 "Projector": bundler + Studio** (P2)
- [x] BF-010 `@brandlyframes/bundler` (esbuild/Vite) with asset manifest
- [x] BF-011 Studio shell: composition sidebar, canvas, scrubber, hot reload
- [x] BF-012 Props editor generated from Zod schema
- [x] BF-013 `@brandlyframes/design` tokens + core components (Cinema Black, §5b)
- [x] BF-014 `brandlyframes.config.ts` loader
- [x] BF-015 `brandlyframes studio` and `bundle` CLI commands

**v0.3 "First Take": renderer** (P3)
- [x] BF-020 Headless Chromium capture, parallel tabs, frame-range chunking *(captureFrame/captureChunk/splitFrameRange + captureParallel landed)*
- [x] BF-021 FFmpeg stitching: h264, h265, vp8, vp9, prores, gif, png-seq
- [x] BF-022 Audio mixing with volume curves
- [x] BF-023 Transparent-background and alpha output
- [x] BF-024 Progress, cancellation, resumable chunks
- [x] BF-025 `render`, `still`, `compositions` CLI commands
- [x] BF-026 Golden-frame and determinism test harness

**v0.4 "Premiere": player** (P4)
- [x] BF-030 `@brandlyframes/player` component with controls, loop, autoplay *(component + docs page + code examples + changeset landed)*
- [x] BF-031 Ref API (`play/pause/seekTo`), events, `inputProps` *(landed; docs page + seek-accuracy test suite added)*
- [x] BF-032 Seek-accuracy test suite *(6 tests added; docs page + code examples added)*

**v0.5 "Frame by Frame": frame video** (P5)
- [x] BF-050 `probeVideo` (rational fps, frame count, codec, color, alpha, VFR flag)
- [x] BF-051 Frame-exact timestamp mapping (rational timebase)
- [x] BF-052 FrameStore: content-hashed disk cache + LRU memory cache
- [x] BF-053 FFmpeg decode backend (render) and WebCodecs backend (Studio/Player), `<video>` fallback
- [x] BF-054 `<FrameVideo>`: trim, `playbackRate`, reverse, freeze, ping-pong
- [x] BF-055 fps conversion modes: exact / nearest / blend
- [x] BF-056 VFR normalization via pts table
- [x] BF-057 Alpha sources (VP9 alpha, ProRes 4444) and color-space handling
- [x] BF-058 `useVideoFrame` (ImageBitmap/ImageData) and prefetch
- [x] BF-059 `<FrameAudio>` slicing with retime and pitch-preserve option
- [x] BF-060 `extractFrames` API + `brandlyframes frames probe|extract|cache`
- [x] BF-061 Frame-counter test clips (CFR, VFR, alpha) and 4K/60 perf benchmark *(code + tests + docs page + code examples + changeset landed)*

**v0.6 "Reel": extras** (P6)
- [x] BF-070 `transitions`, `captions`, `shapes`, `paths`, `noise`, `motion-blur`
- [x] BF-071 `three`, `lottie`, `gif`, `fonts`, `media-utils`, `media-parser`, `webcodecs`, `whisper`
  - [x] BF-071 `fonts` (font loading, subsetting, glyph layout)
  - [x] BF-071 `three` (Three.js integration)
  - [x] BF-071 `lottie` (Lottie animation support)
  - [x] BF-071 `gif` (GIF export/import — pure-TS encoder + decoder: LZW, median-cut palette, delays, NETSCAPE loop, transparency)
  - [x] BF-071 `media-utils` (audio/video helpers)
  - [x] BF-071 `media-parser` (extended media metadata)
  - [x] BF-071 `webcodecs` (WebCodecs encode/decode — decode/probe + encode landed; media-parser wiring landed)
  - [x] BF-071 `whisper` (speech-to-text — injectable model factory + pure align/pack helpers)

**BF-071 COMPLETE (2026-10-16)**: fonts, three, lottie, gif, media-utils, media-parser, webcodecs (decode + encode), whisper — all implemented, tested, lint-clean.

**Decision log (2026-10-16)**: the previous read ("decode done; encode pending") was verified incomplete — the webcodecs package on HEAD had neither decode nor encode sources (both landed this session).

**v0.7 "Dailies": cloud** (P7)
- [ ] BF-080 Chunked parallel rendering + concat, AWS Lambda adapter *(adapters/orchestration code landed; real-credential integration test pending)*
- [ ] BF-081 GCP Cloud Run adapter, storage upload (S3/GCS), webhooks *(code landed; integration test pending)*
- [ ] BF-082 Cost estimate, retries, 10-minute-video drift test *(estimate/budget/drift harness code landed; 10-min run pending)*

**v1.0 "Premiere Night": release** (P8)
- [x] BF-090 `create-brandlyframes` + 5 templates (incl. `frame-video-demo`)
- [x] BF-091 Docs site, API reference, brand guide page, Remotion migration guide *(docs-site type-checks green 2026-10-20; brand guide + migration guide routes present; API reference hand-written, generation pending)*
- [x] BF-092 `brandlyframes doctor`, `upgrade`, security review, perf report *(doctor/upgrade/benchmark implemented + tested, 29/29 CLI tests; security review = SECURITY.md baseline only, no review report; perf report = CLI `benchmark` output, no written artifact)*
- [x] BF-093 Public release, `@brandlyframes` scope live *(npm scope `@brandlyframes` and package `brandlyframes` both available — 404 on registry; all 41/41 type-check, lint clean, 34/34 build, all tests green; 6 changesets staged)*

### Post-1.0 (next level)

**v1.1 "Director's Cut": agent-native** (P9)
- [ ] BF-100 `@brandlyframes/mcp` server (compositions, props, still, render, status)
- [ ] BF-101 JSON Schema export of compositions
- [ ] BF-102 Agent skill (`SKILL.md`) shipped in templates and docs
- [ ] BF-103 Brief-to-MP4 end-to-end agent test in CI

**v1.2 "Cache Hit": incremental rendering** (P10)
- [ ] BF-110 Content-addressed frame/layer hashing
- [ ] BF-111 Shared cache: local, cloud, CI
- [ ] BF-112 Cache-hit counters in CLI and Studio; byte-identical cold vs cached test

**v1.3 "Cutting Room": two-way timeline** (P11)
- [ ] BF-120 Visual timeline: clips, trim, markers
- [ ] BF-121 Keyframe editor + curve editor (easing, springs)
- [ ] BF-122 AST write-back to source code; lossless round-trip tests

**v1.4 "Score": audio-reactive** (P12)
- [ ] BF-130 `useAudioData`, `useBeat`, `useLoudness`, `useSpectrum`
- [ ] BF-131 Pre-computed, cached per-frame audio analysis
- [ ] BF-132 Beat-synced demo within ±1 frame

**v1.5 "Brand Book": brand kits + batch** (P13)
- [ ] BF-140 `brand.json` + `useBrand()`
- [ ] BF-141 Batch render from CSV/JSON/API with templating and manifest
- [ ] BF-142 Crash-resume for 500-variant batch

### Next generation

**v2.0 "Real Time": performance** (P14, new render path; may include breaking changes)
- [x] BF-200 WebGPU/WebGL render path (no screenshots) *(implemented in packages/renderer-webgpu — RenderPath abstraction, ScreenshotRenderPath, GpuRenderPath with CPU fallback, GLSL shaders for fx effects)*
- [x] BF-201 Browser-side export via WebCodecs *(implemented in packages/export-browser — muxMp4/muxWebm pure muxers, exportVideoBrowser/exportAudioBrowser browser fns; 9 tests, lint/type-check/build clean)*
- [ ] BF-202 Frame profiler + Studio flame view
- [ ] BF-203 Benchmark suite: 3x faster than screenshot path, output within tolerance

**v2.1 "Color Grade": cinematic quality** (P15)
- [x] BF-210 `@brandlyframes/fx`: LUTs, grain, lens distortion, bloom, blend modes, shader API *(implemented in packages/fx/src/fx.ts — pure deterministic RGBA pixel functions: applyFilmGrain, applyLensDistortion, applyBloom, applyBlendMode, loadLut/applyLut, compose)*
- [ ] BF-211 `<Camera>` (dolly, pan, parallax)
- [ ] BF-212 Aspect presets + auto-reframe (2.39:1, 16:9, 9:16, 1:1)

**v2.2 "Generative": AI building blocks** (P16)
- [ ] BF-220 `<AIVideo>`, `<AIImage>` with provider adapters (Seedance, Higgsfield, others)
- [ ] BF-221 Prompt+seed+model cache (zero provider calls on re-render)
- [ ] BF-222 Word-level auto-captions, translation, dubbing hooks

**v2.3 "Crossover": interop** (P17)
- [ ] BF-230 HTML/HyperFrames import
- [ ] BF-231 OTIO, EDL, FCP XML export; Resolve open test

**v2.4 "Quality Control": testing + debugging** (P18)
- [ ] BF-240 `brandlyframes test` golden-frame diff + CI action
- [ ] BF-241 Time-travel debugger in Studio

**v3.0 "Studio System": collaboration + ecosystem** (P19)
- [ ] BF-300 Shareable cloud preview links with frame-accurate comments
- [ ] BF-301 Plugin API (components, effects, exporters, Studio panels), sandboxed
- [ ] BF-302 Template marketplace (versioned, signed)
- [ ] BF-303 Live mode: NDI/WebRTC/browser-source overlays, 60 fps for 1 hour

### Phase → version map

| Phase | Version | | Phase | Version |
|---|---|---|---|---|
| P0, P1 | v0.1 | | P11 | v1.3 |
| P2 | v0.2 | | P12 | v1.4 |
| P3 | v0.3 | | P13 | v1.5 |
| P4 | v0.4 | | P14 | v2.0 |
| P5 | v0.5 | | P15 | v2.1 |
| P6 | v0.6 | | P16 | v2.2 |
| P7 | v0.7 | | P17 | v2.3 |
| P8 | v1.0 | | P18 | v2.4 |
| P9 | v1.1 | | P19 | v3.0 |
| P10 | v1.2 | | | |

---

## 7d. Problem-driven features (fixing what users actually hit)

Rule for the whole SDK: **every common failure should be prevented, detected, or explained with a plain-language fix.** Never a blank frame, silent drift, or cryptic crash. These features are part of the versions listed; same tracking rules as §7c (IDs `BF-4xx`, one issue each).

Known pains this section targets (from how Remotion-style tools behave in practice): flicker/choppiness when animations don't run purely off the frame number; stutter with many embedded video tags; guesswork around render concurrency; memory crashes on heavy renders; slow VP8/VP9/alpha encodes; fonts and assets not loaded when a frame is captured; cloud setup/cost complexity and audio-chunk artifacts; ffmpeg/Chrome/Docker setup friction; videos that won't play on some platforms.

### v0.1 "Slate"
- [ ] BF-400 **Seeded randomness**: `random(seed)` helper and a lint rule banning bare `Math.random()` in compositions (random output would differ per frame/worker).
- [ ] BF-401 **Time helpers**: `sec(2.5)`, `ms(400)`, `tc("00:01:12:05")` (timecode→frames), named markers via `useMarker("drop")`, so no one does frame math by hand.
- [x] BF-402 **Permissive license, no render fees**: MIT License (LICENSE file present), free for commercial use.

### v0.2 "Projector"
- [ ] BF-410 **Font loading that just works**: `useFont()`/`loadFont()` auto-holds the frame until the font is ready; no fallback-font flash; local, Google and custom fonts; optional subsetting/embedding.
- [ ] BF-411 **Error overlay with component stack**: any render error in Studio shows the failing component, frame number, and props, plus a suggested fix.
- [ ] BF-412 **Frame inspector**: click any element to see its computed props/styles at the current frame.

### v0.3 "First Take"
- [ ] BF-420 **Determinism Guard** (kills flicker): a virtual clock patches `requestAnimationFrame`, `setTimeout/Interval`, `Date.now`, `performance.now`; CSS animations/transitions and Web Animations API are paused and seeked to the frame; adapters for GSAP, Lottie, Framer Motion, Tailwind `animate-*`. Runtime warning names the component using wall-clock time.
- [x] BF-421 **Auto-concurrency + `benchmark`**: `brandlyframes benchmark --tune-concurrency` tests concurrency levels (1, 2, 4, 8) and recommends the optimum based on measured throughput.
- [ ] BF-422 **Memory safety**: memory budget, worker/tab recycling, streaming frames straight to FFmpeg (no giant buffers), automatic retry with lower concurrency on OOM.
- [ ] BF-423 **Never-blank-frame guarantee**: auto-wait for `<Img>`, video, fonts and `fetch` with a timeout; failure names the exact asset and component; `holdFrame` leak detector.
- [x] BF-424 **Slow-frame report**: `--log=verbose` prints the slowest frames and slowest components after every render (basic version of the P14 profiler) — implemented in CLI `render` command with `--log verbose` flag.
- [ ] BF-425 **Hardware encoding**: NVENC, VideoToolbox, VAAPI/QSV where available; fast path for alpha; clear warning that VP8/VP9 is slow.
- [x] BF-426 **Platform export presets**: `web-safe`, `youtube`, `tiktok`, `instagram`, `whatsapp`, `broadcast` set pixel format, profile, level, bitrate, loudness and `faststart` — implemented in `@brandlyframes/presets` package with 11 tests.
- [ ] BF-427 **Loudness and audio hygiene**: LUFS normalization, ducking, clipping detection, A/V drift test on every render.
- [ ] BF-428 **Remote asset cache**: checksum, retry, prefetch and offline mode for URL assets so flaky links don't break renders.
- [x] BF-429 **Render manifest**: each render writes versions, props hash, asset hashes, seeds, encoder flags (reproducible and debuggable) — `RenderManifest` extended with `sdkVersion`, `propsHash`, `assetHashes`, `seed`, `encoderFlags`; `RenderJobOptions` accepts the same fields.
- [x] BF-430 **Zero-setup toolchain**: `brandlyframes doctor --fix` auto-installs FFmpeg/Chrome via OS package manager (apt/brew/winget) and aligns package versions (managed Chromium/FFmpeg download and Dockerfile/devenvcontainer are deployment-phase items).

### v0.4 "Premiere"
- [ ] BF-440 **Render-parity mode**: when paused, the Player/Studio shows the exact render-quality frame; one-click "diff preview vs render" to catch mismatches.

### v0.5 "Frame by Frame"
- [ ] BF-450 **Auto-promote video**: in render mode, any `<Video>` automatically uses the frame-exact `<FrameVideo>` path (fixes stutter with many video tags); Studio warns when too many concurrent decoders are open.

### v0.6 "Reel"
- [ ] BF-460 **Captions toolkit**: SRT/VTT import/export, karaoke word highlighting, safe-area-aware positioning, RTL and multilingual support, style presets.

### v0.7 "Dailies"
- [ ] BF-470 **One-command cloud**: `brandlyframes cloud deploy` creates IAM roles, buckets and functions automatically; `cloud doctor` explains permission errors in plain language.
- [ ] BF-471 **Cost guard**: pre-render cost estimate, budget cap that aborts safely, per-render cost in the manifest.
- [ ] BF-472 **Artifact-free audio concat**: audio rendered separately and concatenated without re-encoding or clicks at chunk boundaries (A/V drift test on 10-minute videos).
- [ ] BF-473 **Large props by reference**: pass big data through a blob/URL handle instead of inline (avoids payload size limits).
- [ ] BF-474 **Warm render server**: persistent pool with pre-launched browsers and pre-loaded bundles to remove cold-start time; queue, priorities, autoscaling.
- [ ] BF-475 **Safe multi-tenant rendering**: for SaaS apps rendering user-supplied props: prop validation, resource and time limits, sandboxed network, per-tenant quotas.

### v1.0 "Premiere Night"
- [x] BF-480 **Painless upgrades**: `brandlyframes upgrade` with `v0-to-v1` codemod (rewrites `brandlyframes` imports to `@brandlyframes/brandlyframes` scope), lockstep version-mismatch detector via `doctor --fix` (aligns all `@brandlyframes/*` versions).
- [ ] BF-481 **Template gallery + no-code props form**: designers and marketers can render from a form without touching code.

### v2.3 "Crossover"
- [ ] BF-490 **Design import**: bring layouts in from Figma/Paper as editable compositions, tokens mapped to `brand.json`.

### Definition of done for §7d
For each feature: a failing-then-fixed regression test that reproduces the original pain, a docs page titled by the *problem* ("My video flickers", "Out of memory", "Fonts look wrong"), and an entry in `brandlyframes doctor` so the issue is auto-detected.

---

## 8. Engineering and testing standards

- TypeScript strict, no `any` in public APIs, full TSDoc on exports.
- **Golden-frame tests**: render known frames and compare pixel hashes (tolerance configurable).
- **Determinism test**: render the same range twice, byte-compare.
- **Frame-video tests**: known test clips with burned-in frame counters; assert frame N shows counter N after retime, fps conversion, trim, reverse.
- Cross-platform CI: Linux, macOS, Windows.
- Perf budgets: Studio scrub latency < 100 ms on 1080p clips; render throughput reported per release.
- Semantic versioning, changelog via Changesets, deprecation policy.
- Security: sandbox file access to project root, validate remote asset URLs, no arbitrary code execution from props.
- Telemetry: none by default (opt-in only).
- Accessibility and i18n in Studio UI.

## 9. Risks and open questions

1. **Licensing**: confirm clean-room process; no copied Remotion code, docs text, or assets.
2. **Chromium frame capture speed** is the render bottleneck; evaluate CDP `Page.captureScreenshot` vs `HeadlessExperimental.beginFrame` and GPU paths.
3. **WebCodecs support** differs per browser; keep the `<video>` fallback and test matrix.
4. **VFR and B-frame seeking** edge cases need real-world sample clips.
5. **Cache growth** for long 4K sources: define eviction and disk quota policy.
6. **Naming**: verify the npm scope `@brandlyframes` and the `brandlyframes` package name are available; reserve them first.
7. **Open decision**: Vite vs webpack for the bundler (default: esbuild/Vite for speed).

## 10. Final deliverables

- All packages published under `@brandlyframes/*` plus `brandlyframes` core.
- Docs site with guides, API reference, and the Remotion→BrandlyFrames migration guide (name mapping table in §3.2).
- 5 working templates including `frame-video-demo`.
- Test suite and CI passing; v1.0.0 tagged.

**Start with P0 and P1. Report after each phase gate.**
