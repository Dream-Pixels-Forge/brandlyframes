# Run log — P1 core integration pass [BF-002..BF-008][BF-400][BF-401]

> Worker run, continuation of workflow a533b42a (v0.1 "Slate"). Resumed from a
> tree containing the three committed TDD passes (timing `b80a0b3`, animation
> `195107a`, registry/runtime `075bb6d`) and wired them into one public API.

## What was done

1. **Public API wiring** — `packages/core/src/index.ts` rewritten from the P0
   placeholder into the curated public API: named re-exports (no `export *`)
   grouped by module — timing, context, hooks, components, animation,
   registry, runtime, utils — with module-level TSDoc on every section.
   `BRANDLYFRAMES_VERSION` kept (smoke test depends on it). The only
   cross-module name overlap (`FreezeFrameOverride`, defined once in
   `timing/freeze-frames.ts` and re-exported by components) is exported once,
   from timing. No `any` anywhere in the public API (grep clean; goal §8).
2. **Coverage gates** — `packages/core/vitest.config.ts` coverage extended
   from `src/animation/**` to `src/timing/**` + `src/animation/**`, with
   vitest 5 flat-glob thresholds: global `lines: 90` plus
   `'src/timing/**': { lines: 90 }` and `'src/animation/**': { lines: 90 }`.
   Note: vitest 5.0.4 does not support an `overrides` sub-object — glob keys
   sit directly under `thresholds`.
3. **Cross-module determinism tests** — the existing
   `test/timing/determinism.test.tsx` (timing + context + components, byte-
   identical SSR) was extended with a `cross-module determinism through the
   public API` describe block: one composite resolution per frame through
   `src/index` (timing `resolveSequenceFrame` + `interpolate` + `spring` +
   `interpolateColors` + `random`) asserted identical when resolved twice for
   frames 0..130, plus byte-identical double SSR renders through the public
   entry. `spring()` requires non-negative integer frames, so the composite
   clamps the spring input via `Math.max(0, sequenceFrame)`.
4. **Changeset** — `.changeset/p1-core-public-api.md`: minor bump for
   `brandlyframes` describing BF-002..BF-008, BF-400, BF-401.
5. **README** — `packages/core/README.md`: quick-start snippet
   (`registerRoot` + `<Composition>` + `useCurrentFrame` + `interpolate` +
   `<Sequence>`), public API map, dev commands, clean-room note.

## Command results (all run from repo root, exit codes verified)

| Command | Result |
|---|---|
| `pnpm type-check` | exit 0 |
| `pnpm lint` (`eslint . --max-warnings 0`) | exit 0 |
| `pnpm build` | exit 0 (turbo, `tsc --noEmit`) |
| `pnpm test` | exit 0 — 29 test files, 366 tests passed |
| `vitest run --coverage` (packages/core) | exit 0 — thresholds pass |

## Coverage (src/timing/** + src/animation/**, v8 provider)

- Statements 100% (354/354) · Branches 100% (260/260) · Functions 100%
  (75/75) · **Lines 100% (307/307)** — both globs fully covered, so the 90%
  per-glob gate passes with margin. Threshold enforcement verified by tsc
  (vitest exits non-zero when thresholds fail).

## Commits

- `feat(core): public API wiring + coverage gates [BF-002][BF-003][BF-004][BF-005][BF-006][BF-007][BF-008][BF-400][BF-401]`
  (includes the pending dev-notes/PROGRESS.md update from the orchestrator's
  workflow dispatch; the untracked workflow script
  `dev-notes/workflows/v01-p1-core.js` is intentionally left uncommitted —
  `dev-notes/` is excluded from lint/format and workflow scripts are
  orchestrator tooling, not product source).

## Boundary compliance

- No scope beyond the seven assigned tasks; no dependency changes
  (`@vitest/coverage-v8` was already a devDependency).
- No product/architecture decisions taken outside the task contract.

## Next (not in this run)

P1 reviewer gate (T_P1_GATE in the workflow): independent re-verification of
the four scripts, coverage numbers, gate-item test list, `Math.random` grep,
public-API spot checks, and conventional commits.
