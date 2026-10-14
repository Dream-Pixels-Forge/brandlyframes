# BRAINSTORM — BrandlyFrames Architecture Vision

> Condensed from `dev-notes/Goals/GOAL_00.md` — the single source of truth.
> **BrandlyFrames**: a programmatic video SDK. React in, MP4 out.
> License MIT/Apache-2.0. **Clean-room**: replicate Remotion's *architecture
> and concepts*, never its source code.

## 1. Mission

Ship an open SDK to create videos programmatically with React. A video is a
pure function of the frame number: **`frame -> pixels`**.

Developers write components, preview them live in a Studio, embed them in a
web Player, and render them to MP4/WebM/GIF/PNG-sequence — locally, on a
server, or in the cloud.

**Headline feature beyond Remotion:** first-class **frame-by-frame video**
(`<FrameVideo>`). Any source video is decoded to exact frames, addressable by
frame index, deterministic in preview and render, and usable as pixel data
for effects.

### Principles (non-negotiable)

1. **Determinism** — the same frame number always yields the same pixels.
2. **Frame is the clock** — no `Date.now()`, no CSS time-based animation;
   everything derives from `useCurrentFrame()`.
3. **React-native DX** — components, hooks, props; Zod-typed input props.
4. **Modular monorepo** — small packages, each with a single job.
5. **Parallel, resumable rendering** — chunked across workers/lambdas.
6. **Frame accuracy** — no off-by-one, no drift, VFR-safe.

## 2. Package map (Remotion vs BrandlyFrames)

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

All packages are written from scratch under MIT/Apache-2.0; public API names
are BrandlyFrames' own.

## 3. Pipeline flow (GOAL_00 §3.3)

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

Key delta vs Remotion: the **FrameStore** — the source video is decoded once
into a content-hash-keyed, frame-indexed cache shared by parallel workers, so
frame N is always exact and pre-decoded, never extracted ad hoc per frame.

## 4. Build-agent roles (subagent-driven development)

The program is built phase by phase (P0…P19 in GOAL_00 §7/§7b). Three roles:

### Orchestrator
- Owns the roadmap: dispatches **one phase-scoped worker per phase** with
  five items — scope, inputs, outputs, boundaries, verification (the DoD
  gate).
- Holds the gates: a phase never advances until its DoD gate passes
  ("Do not advance a phase until its gate passes").
- Tracks features as `BF-###` ids (one id = one issue = one PR) and reports
  after each phase gate.
- On a failed gate: re-dispatch the worker with the failure report (bounded
  retries), then escalate instead of widening scope silently.

### TDD worker
- Implements exactly one phase (or one `BF-###` feature) at a time.
- Test-driven: write the failing test first (golden frame, determinism,
  frame-counter clip), then the implementation that passes it.
- Writes all code from scratch (clean-room): no Remotion source, docs text,
  or assets may be consulted or copied.
- Returns evidence with the result: tests added, gate commands run, changed
  files.

### Gate reviewer
- Independent of the worker: re-runs the phase's DoD gate
  (P0: `pnpm build && pnpm test` green in CI; P1: 90%+ unit tests on
  timing/interpolate/spring; P3: frame N matches golden image; …).
- Verifies contract compliance (API names, determinism, license) and either
  passes the phase back to the orchestrator or blocks it with a failure
  report.

## 5. Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Bundler | **esbuild + Vite** (not webpack) | Speed; resolves GOAL_00 §9 open question 7 |
| Monorepo | **pnpm workspaces + Turborepo** | Strict dependency isolation, disk efficiency, task caching |
| Tests | **Vitest** (unit) + **Playwright** (browser/E2E) | Fast frame-level unit tests; real-browser Studio/Player checks |
| Releases | **Changesets, fixed lockstep publishing** | All `@brandlyframes/*` packages share one version per release; tag `vX.Y.0`, update `CHANGELOG.md` |
| License | **MIT/Apache-2.0** | Permissive; free for commercial use, no render fees (BF-402) |
| Clean-room | **Architecture only, never code** | Remotion uses a custom license; no copied source, docs text, or assets; BrandlyFrames' own API names |
| Semver | `0.x` may break between minors; from `1.0`, breaking only in majors with migration guide + deprecation window | GOAL_00 §7c rule 4 |

## 6. Risks and mitigations (GOAL_00 §9)

| # | Risk | Mitigation |
|---|---|---|
| 1 | **Licensing** — the clean-room process must be provable | Replicate architecture/concepts only; never copy Remotion code, docs text, or assets; all code written from scratch under MIT/Apache-2.0 |
| 2 | **Chromium frame capture speed** is the render bottleneck | Evaluate CDP `Page.captureScreenshot` vs `HeadlessExperimental.beginFrame` and GPU paths before freezing the renderer design |
| 3 | **WebCodecs support** differs per browser | Keep the `<video>` seek fallback and maintain a browser test matrix |
| 4 | **VFR and B-frame seeking** edge cases | Collect real-world sample clips; normalize VFR via a pts table (BF-056) |
| 5 | **Cache growth** for long 4K sources | Define FrameStore eviction and disk-quota policy up front (BF-052) |
| 6 | **Naming** availability | Verify and reserve the npm scope `@brandlyframes` and the `brandlyframes` package name first (BF-001) |
| 7 | **Open decision: Vite vs webpack** | Resolved: esbuild/Vite for speed; revisit only with benchmark evidence |
