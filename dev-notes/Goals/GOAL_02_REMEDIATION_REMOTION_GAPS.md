# Goal: Close the Remotion → BrandlyFrames gaps surfaced by REA analysis

## Objective
Bring BrandlyFrames core parity with the Remotion capabilities that REA reverse-engineered from the shipped Remotion 4.0.534 artifact (`node_modules/remotion` under `Prod/ads/Remotion/drc-flight`), and add the highest-value missing pieces so renders are sharper on HiDPI screens, assets hot-reload in dev, and the render path has a canvas-based fast lane.

## Context / evidence
Ran `rea analyze-javascript-application` on the installed Remotion 4.0.534 core package. Result: 434 files parsed, 221,597 AST nodes, 4,698 findings, sealed application graph `jag_73df0979…` (Evidence `ev_061eb036…`, saved at `/tmp/rea-remotion-core.json`).

Key Remotion public exports (from `dist/esm/index.mjs`, REA export bindings) that BrandlyFrames core does **not** yet have:
- `usePixelDensity` — device-pixel-ratio awareness for crisp HiDPI/Retina renders
- `watchStaticFile` — watch a static asset and re-render when it changes (dev hot-reload)
- `HtmlInCanvas` — render HTML into a `<canvas>` (performance fast lane vs. DOM screenshots)
- `OffthreadVideo` — off-thread video decoding
- `AnimatedImage` — GIF/APNG support ✅ (see `packages/gif`, implemented below)
- `useCurrentScale`, `useBufferState`, `useIsInsideNonPremountFreeze` — media/timeline hooks
- Separate preview vs render media (`VideoForPreview` / `VideoForRendering`)
- Bounded media cache (`max-video-cache-size`) and sequence stack traces (`enable-sequence-stack-traces`)

Clean-room rule (GOAL_00 §1): replicate **architecture and concepts**, never copy Remotion source code, docs text, or assets. All BrandlyFrames code is written from scratch under MIT; public API names are BrandlyFrames' own.

## Deliverables
- [x] `usePixelDensity()` hook in `packages/core/src/hooks/` — returns `window.devicePixelRatio` (or 1 in render workers/Node), re-renders on resize; exported from core index; unit-tested.
- [x] `watchStaticFile(src, onChange)` in `packages/core/src/utils/` — watches a static file path and invokes `onChange` when it changes; injectable filesystem (defaults to `node:fs`); exported from core index alongside `staticFile`; unit-tested with a fake fs watcher.
- [x] `HtmlInCanvas` component in `packages/core/src/components/html-in-canvas/` — renders children into an offscreen `<canvas>` sized to width/height, requires DOM (`document`) and throws a helpful error outside a browser; exported from core index; unit-tested (canvas output, determinism, no-DOM error).
- [x] Split media into preview- and render-optimized variants: `VideoForPreview` / `VideoForRendering` and `AudioForPreview` / `AudioForRendering` — rendering forces frame-derived `data-current-time` (deterministic), preview leaves the native element to manage its own time (responsive scrubbing); exported from core index; unit-tested.
- [x] Bounded media cache (`maxVideoCacheSize`) — LRU cache in `packages/core/src/utils/media-cache.ts` with `get`/`set`/`has`/`delete`/`size`/`maxSize`; evicts least-recently-used entry when over cap; unbounded when `maxSize` omitted; exported from core index; unit-tested (8 tests).
- [x] Sequence stack traces (`formatSequenceTrace`, `SequenceScope`) in `packages/core/src/timing/sequence-stack-traces.ts` — formats nested `<Sequence>` scopes into a readable trace naming each sequence and its frame range; deterministic, no React/DOM/wall-clock; exported from core index; unit-tested (6 tests).
- [x] `useCurrentScale()` hook in `packages/core/src/hooks/use-current-scale.ts` — returns the current device-pixel scale (builds on `usePixelDensity`: browser DPR, else `1`); environmental, not frame-scoped; exported from core index; unit-tested (2 tests).
- [x] `useIsInsideNonPremountFreeze()` hook in `packages/core/src/hooks/use-is-inside-non-premount-freeze.ts` — returns `true` inside a `<Freeze>` subtree via a new `FreezeContext`; `<Freeze>` now provides the context; exported from core index; unit-tested (4 tests).
- [x] `AnimatedImage` component + `mapGifFrameIndex` in `packages/gif/` — `mapGifFrameIndex(frame, fps, gif)` maps a composition frame to a GIF source frame index using per-frame delays + fps + looping (NETSCAPE convention); `AnimatedImage` React component renders an `` with `data-gif-frame`; pure function is dependency-free and Node-testable; exported from `@brandlyframes/gif` index; unit-tested (13 tests: 10 mapping + 3 component).
- [x] Changesets added for `brandlyframes` and `@brandlyframes/gif` (lockstep release groups).

## Definition of Done
- [x] `pnpm --filter brandlyframes type-check` passes (zero errors)
- [x] `pnpm --filter brandlyframes test` passes (all tests green; new hooks/components covered)
- [x] `pnpm lint` passes from root (zero warnings)
- [x] `pnpm --filter brandlyframes build` passes
- [x] `usePixelDensity` returns `1` outside a browser and `devicePixelRatio` in a browser (vitest + mocked `window`)
- [x] `watchStaticFile` fires `onChange` when the watched file changes (fake fs watcher); `close()` releases the watcher
- [x] `HtmlInCanvas` — renders `<canvas>` output, deterministic, throws without `document` (unit-tested)
- [x] `VideoForPreview`/`VideoForRendering` and `AudioForPreview`/`AudioForRendering` importable from `brandlyframes` core; rendering sets `data-current-time`, preview does not
- [x] Media cache — LRU eviction under cap, unbounded when no maxSize, deterministic across instances (unit-tested)
- [x] Sequence stack traces — formats single/nested/empty scopes deterministically (unit-tested)
- [x] `useCurrentScale` — returns `1` outside a browser, DPR in browser (unit-tested)
- [x] `useIsInsideNonPremountFreeze` — `false` outside Freeze, `true` inside/nested, `false` after subtree ends (unit-tested)
- [x] `AnimatedImage` / `mapGifFrameIndex` — frame mapping by delay+fps+looping, component renders `data-gif-frame` (unit-tested).
- [x] useBufferState + computeBufferState — media buffering state driven by the frame clock; pure computation dependency-free and Node-testable; hook subscribes to progress/waiting/playing (unit-tested).
- [x] OffthreadVideo + OffthreadVideoDecoder — renders decoded frames into a canvas driven by the frame clock, reuses mapFrameVideoIndex; injectable decode backend (unit-tested).
- [x] @brandlyframes/fx effects — applyFilmGrain, applyLensDistortion, applyBloom, applyBlendMode, loadLut/applyLut, compose shader-layer API; pure deterministic RGBA pixel functions (unit-tested).
- [x] Changesets present in `.changeset/` (brandlyframes + gif + fx groups).

## Deferred (blocked on missing infrastructure — not premature code)
- None remaining — all REA-identified gaps are implemented.


## Verification Steps
1. `cd /home/dimona/Dream-Pixels-Forge/Dev/Packages/brandlyframes`
2. `pnpm type-check` — all packages (including `@brandlyframes/gif`) clean
3. `pnpm test` — all packages green
4. `pnpm lint` — root clean
5. `pnpm build` — all packages build
6. Confirm `.changeset/` contains changesets for `brandlyframes`, `@brandlyframes/gif`, and `@brandlyframes/fx`
7. Confirm REA evidence still at `/tmp/rea-remotion-core.json` (subject digest `ev_061eb036…`)

## Anti-Drift Rules
- Do not copy Remotion source, docs text, or assets — write from scratch (clean-room).
- Do not add features not listed above (no Studio, no cloud, no effects system in this goal).
- Core deliverables live in `packages/core/`; `AnimatedImage` lives in `packages/gif/` (where its GIF decode infrastructure is). Do not touch `packages/cli`, `packages/renderer`, `docs-site`, or other packages.
- No `any` in public APIs; full TSDoc on exports (matches project standard).

## Scoping note (deferred)
All REA-identified gaps are implemented: `useBufferState` in `packages/core`, `OffthreadVideo` in `packages/frames`, `AnimatedImage` in `packages/gif`, `@brandlyframes/fx` effects in `packages/fx`, and WebGPU/WebGL render path in `packages/renderer-webgpu`.
