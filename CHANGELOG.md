# BrandlyFrames Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Root `tsconfig.json` — type-checks all packages together with proper `@brandlyframes/webcodecs` path mapping.
- Root `vitest.config.mjs` — unified vitest config including `packages/*/test/**`.
- `RenderJob` orchestration (`packages/renderer/src/job.ts`): progress events (`chunk-start`/`frame`/`chunk-done`), `AbortSignal` cancellation, and manifest-based resume via `render-manifest.json` ([BF-024]).
- Real headless-Chrome launcher (`packages/cli/src/cdp-launcher.ts`): CDP-over-WebSocket `LauncherFn` implementation with `CdpClient`/`CdpTab`/`CdpLauncher` ([BF-020]).

## [0.1.0] — P1 core public API (Slate) [BF-001..BF-401]

### Added

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

## [0.1.0] — v0.1 "Premiere" player phase [BF-030..BF-032]

### Added

- **BF-030** — `<Player>` component: embeddable web player with controls, loop, autoplay, inputProps, width/height, className/style, and event callbacks (onPlay, onPause, onFrameChange, onEnded, onError).
- **BF-031** — Imperative ref API: `play()`, `pause()`, `seekTo(frame)`, `getCurrentFrame()`, `getDurationInFrames()`, `getPlaybackRate()`, `setPlaybackRate(rate)`, `isPlaying()` via `forwardRef` + `useImperativeHandle`.
- **BF-032** — Frame-exact seeking: `seekTo` lands precisely on the requested 0-indexed frame without timestamp drift, across browsers. Seek-accuracy test suite added.

Also: docs page at `/docs/player`, code examples in `docs-site/src/code-examples/player.ts`, and a changeset for the `@brandlyframes/player` package (v0.1.0 → v0.2.0).

## [0.1.0] — Test clips & 4K/60 perf benchmark [BF-061]

### Added

- `TEST_CLIPS` (CFR, VFR, alpha, and 4K/60 perf clip specs) plus test-clip generator utilities:
  - `generateFrameCounterText(frameIndex, totalFrames, fps)` — burned-in frame counter text with elapsed time.
  - `createFrameCounterFrame(spec, frameIndex)` — synthetic RGB/RGBA frame with frame counter, deterministic for a given spec + frame index.
  - `generateTestClipManifest()` / `writeTestClipManifest(outputDir)` — manifest JSON of all predefined clips.
  - `runPerfBenchmark(clipSpec)` — frame decode/encode perf benchmark result.

See the **Test Clips** docs page for usage examples.

[Unreleased]: https://github.com/brandlyframes/brandlyframes/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/brandlyframes/brandlyframes/releases/tag/v0.1.0
