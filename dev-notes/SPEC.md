# SPEC — BrandlyFrames Engineering Spec

> Condensed from `dev-notes/Goals/GOAL_00.md` (single source of truth).
> Companions: `BRAINSTORM.md` (vision), `SECURITY.md` (baseline),
> `DESIGN.md` (Cinema Black tokens).

## 1. Repository structure (GOAL_00 §5)

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

Stack: TypeScript (strict), pnpm workspaces + Turborepo, esbuild/Vite for
bundling, Vitest + Playwright for tests, Changesets for releases.

## 2. Core API contracts

### 2.1 Concept mapping (GOAL_00 §3.2)

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

### 2.2 FrameVideo public API (GOAL_00 §4.2)

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

// 2. Hook: decoded frame as ImageBitmap / ImageData for custom effects
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

Contract requirements (GOAL_00 §4.3): rational timebase mapping (never floats
alone; frame N rendered twice → identical bytes); FrameStore content-hash disk
cache + LRU memory cache shared by parallel workers; pluggable decode backends
(FFmpeg for render, WebCodecs for Studio/Player, `<video>` fallback); VFR
normalization via pts table; fps conversion (nearest/previous/blend); retime
(`playbackRate`, reverse, freeze, ping-pong); alpha (VP9 alpha, ProRes 4444)
and color-space handling with tonemap option; pixel access via
`ImageBitmap` + optional `getImageData()`; backpressure-aware prefetch;
render holds via `holdFrame()`/`releaseFrame()`; companion `<FrameAudio>`
with pitch-preserve; stream decode for 4K/60 and 1h+ sources; clear errors
for unsupported codecs, missing files, corrupt frames.

## 3. Module boundaries — `packages/core` (published as `brandlyframes`)

Six internal modules. Each exports only its public surface from the package
entry; modules never deep-import each other's internals.

| Module | Owns | Must not |
|---|---|---|
| **context + timing** | frame context provider, `useCurrentFrame()`, `useVideoConfig()`, `holdFrame()`/`releaseFrame()`, Sequence offset math primitives | never read wall-clock time (`Date.now`, `performance.now`) — the frame is the clock |
| **components** | `<Composition>`, `<Sequence>`, `<Series>`, `<Loop>`, `<Freeze>`, `<AbsoluteFill>`, `<Img>`, `<Audio>`, `<Video>` | no animation math, no registry mutation |
| **animation** | `interpolate`, `interpolateColors`, `spring`, `Easing`, seeded `random(seed)` (BF-400) | no React context; pure functions only |
| **registry** | composition registry: id, component, `durationInFrames`, fps, width, height, defaultProps, Zod `schema`, `calculateMetadata` | no rendering, no DOM |
| **runtime** | `registerRoot`, deterministic render runtime (BF-420 virtual clock: patches `requestAnimationFrame`, `setTimeout/Interval`, `Date.now`, `performance.now`; CSS/WAAPI seeked per frame), input props bootstrap | no UI, no capture logic |
| **utils** | `staticFile`, `getInputProps`, time helpers `sec()` / `ms()` / `tc()` (BF-401), Zod props helpers | no React dependencies where pure |

Dependency direction: `animation` and `utils` are pure leaves; `context +
timing` depends only on leaves; `components` depends on context/timing;
`registry` and `runtime` sit on top. Nothing imports upward.

## 4. Testing standards (GOAL_00 §8)

- TypeScript strict; **no `any` in public APIs**; full TSDoc on exports.
- TDD: every feature lands test-first (failing test → implementation).
- **Golden-frame tests**: render known frames and compare pixel hashes
  (tolerance configurable).
- **Determinism test**: render the same range twice, byte-compare.
- **Frame-video tests**: known test clips with burned-in frame counters;
  assert frame N shows counter N after retime, fps conversion, trim, reverse.
- Cross-platform CI: **Linux, macOS, Windows**.
- Perf budgets: Studio scrub latency < 100 ms on 1080p clips; render
  throughput reported per release.
- Semantic versioning; changelog via Changesets; deprecation policy.
- Security: sandbox file access to project root, validate remote asset URLs,
  no arbitrary code execution from props (see `SECURITY.md`).
- Telemetry: none by default (opt-in only).
- Accessibility and i18n in Studio UI.

## 5. Definition-of-Done gates per phase (GOAL_00 §7)

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

**Do not advance a phase until its gate passes.** Post-1.0 phases P9–P19
(GOAL_00 §7b) follow the same rule; every new package gets docs, examples,
tests, and a migration note.

Phase → version map: P0/P1→v0.1 "Slate"; P2→v0.2 "Projector"; P3→v0.3
"First Take"; P4→v0.4 "Premiere"; P5→v0.5 "Frame by Frame"; P6→v0.6 "Reel";
P7→v0.7 "Dailies"; P8→v1.0 "Premiere Night"; P9–P13→v1.1–v1.5; P14–P19→v2.0–v3.0.

## 6. Version tracking rules (GOAL_00 §7c)

1. **One feature = one ID = one issue = one PR** (or a small stack of PRs).
   Reference the ID in commits: `feat(frames): frame-exact mapping [BF-051]`.
2. A feature is checked only when: code merged, unit/integration tests
   passing, docs page written, example or template updated, changeset added.
3. A version is released only when every box in it is checked and its gate
   (§5 above) passes. Tag `vX.Y.0`, publish all packages in lockstep (fixed
   versioning), update `CHANGELOG.md`.
4. Semver: `0.x` may break between minors; from `1.0`, breaking changes only
   in majors, with a migration guide and a deprecation window of at least one
   minor.
5. Scope freeze: no new feature enters a version after its first release
   candidate; push it to the next version.
6. Status board kept at `docs/ROADMAP.md`, generated from GOAL_00: columns
   *Planned / In progress / In review / Done*, grouped by version.
7. Each release ships a **demo composition** that exercises its headline
   feature.
