---
'brandlyframes': minor
---

P1 core: the frame -> pixels engine of the v0.1 "Slate" release.

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
