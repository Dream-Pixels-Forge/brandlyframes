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
- `AnimatedImage` — GIF/APNG support
- `useCurrentScale`, `useBufferState`, `useIsInsideNonPremountFreeze` — media/timeline hooks
- Separate preview vs render media (`VideoForPreview` / `VideoForRendering`)
- Bounded media cache (`max-video-cache-size`) and sequence stack traces (`enable-sequence-stack-traces`)

Clean-room rule (GOAL_00 §1): replicate **architecture and concepts**, never copy Remotion source code, docs text, or assets. All BrandlyFrames code is written from scratch under MIT; public API names are BrandlyFrames' own.

## Deliverables
- [x] `usePixelDensity()` hook in `packages/core/src/hooks/` — returns `window.devicePixelRatio` (or 1 in render workers/Node), re-renders on resize; exported from core index; unit-tested.
- [x] `watchStaticFile(src, onChange)` in `packages/core/src/utils/` — watches a static file path and invokes `onChange` when it changes; injectable filesystem (defaults to `node:fs`); exported from core index alongside `staticFile`; unit-tested with a fake fs watcher.
- [ ] `HtmlInCanvas` component — **DEFERRED**. Requires real DOM/canvas infrastructure (`canvas`/`jsdom` deps) that is not present in this node test environment; would be premature to add without a testable render path. Revisit when P3 renderer / canvas support lands.
- [x] Split media into preview- and render-optimized variants: `VideoForPreview` / `VideoForRendering` and `AudioForPreview` / `AudioForRendering` — rendering forces frame-derived `data-current-time` (deterministic), preview leaves the native element to manage its own time (responsive scrubbing); exported from core index; unit-tested.
- [ ] Bounded media cache (`maxVideoCacheSize`) — **DEFERRED**. Core has no frame-decoding consumer yet (lands in P3 renderer / P5 `<FrameVideo>`), so a cache would be unused "for later" code, which ponytail forbids. Wire it in once frames are decoded in core.
- [x] Changeset added for `brandlyframes` (lockstep release group).

## Definition of Done
- [x] `pnpm --filter brandlyframes type-check` passes (zero errors)
- [x] `pnpm --filter brandlyframes test` passes (all tests green; new hooks/components covered)
- [x] `pnpm lint` passes from root (zero warnings)
- [x] `usePixelDensity` returns `1` outside a browser and `devicePixelRatio` in a browser (vitest + mocked `window`)
- [x] `watchStaticFile` fires `onChange` when the watched file changes (fake fs watcher); `close()` releases the watcher
- [ ] `HtmlInCanvas` — deferred (no DOM/canvas test environment)
- [x] `VideoForPreview`/`VideoForRendering` and `AudioForPreview`/`AudioForRendering` importable from `brandlyframes` core; rendering sets `data-current-time`, preview does not
- [ ] Media cache — deferred (no frame-decoding consumer in core yet)
- [x] Changeset present in `.changeset/`

## Verification Steps
1. `cd /home/dimona/Dream-Pixels-Forge/Dev/Packages/brandlyframes`
2. `pnpm --filter @brandlyframes/core type-check`
3. `pnpm --filter @brandlyframes/core test`
4. `pnpm lint`
5. Confirm `.changeset/` contains a new changeset for `@brandlyframes/core`
6. Confirm REA evidence still at `/tmp/rea-remotion-core.json` (subject digest `ev_061eb036…`)

## Anti-Drift Rules
- Do not copy Remotion source, docs text, or assets — write from scratch (clean-room).
- Do not add features not listed above (no Studio, no cloud, no effects system in this goal).
- Keep all new code in `packages/core/` only; do not touch `packages/cli`, `packages/renderer`, `docs-site`, or other packages.
- No `any` in public APIs; full TSDoc on exports (matches project standard).

## Scoping note (deferred)
The remaining REA-identified gaps (`OffthreadVideo`, `AnimatedImage`, separate preview/render media beyond Video/Audio, sequence stack traces, effects/GPU system) are intentionally deferred to later versions — see GOAL_00 §7b/c roadmap. This goal targets the four smallest, highest-impact gaps first.
