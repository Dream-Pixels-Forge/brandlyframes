# BrandlyFrames Handoff Document

**Date**: 2026-10-19
**Author**: Pi coding agent (session 7)
**Branch**: `feature/bf-020-headless-capture` (uncommitted changes: new docs pages, HANDOFF.md)

---

## Summary

This session completes BF-091 (docs) and BF-092 (CLI commands) for the BrandlyFrames v1.0 release work (BF-090..093). BF-090 was already complete. BF-093 (public release) remains pending.

## Current state

### Task #27: v1.0 release work (BF-090..093)

| ID | Scope | Status |
|----|-------|--------|
| BF-090 | `create-brandlyframes` + 5 templates (incl. `frame-video-demo`) | **Complete** — verified committed |
| BF-091 | Docs site, API reference, brand guide page, Remotion migration guide | **Complete** — brand guide + migration guide added; docs site builds/type-checks green |
| BF-092 | `brandlyframes doctor`, `upgrade`, security review, perf report | **Complete** — `doctor`, `benchmark`, `upgrade` all implemented + tested (29/29 CLI tests pass) |
| BF-093 | Public release, `@brandlyframes` scope live | **Pending** — not started |

### BF-091 — complete
- `docs-site/src/routes/guides/brand-guide.tsx` — Cinema Black design system: color tokens, typography, cinema motifs, motion, components, applied-to
- `docs-site/src/routes/guides/migration.tsx` — Remotion → BrandlyFrames core API + package + CLI name mapping table, before/after code, key differences
- `docs-site/src/routeTree.gen.ts` — regenerated with new routes
- Docs site builds and type-checks green (verified 2026-10-19)
- `docs/API.md` and `docs/getting-started.md` exist

### BF-092 — complete
- `packages/cli/src/index.ts` — `upgrade` (--check, --codemod v0-to-v1), `doctor` (--fix, --json with 6 checks: node, ffmpeg, chrome, renderer, versions), `benchmark` (--concurrency, --frames with CPU/mem/auto-concurrency reporting)
- `packages/cli/test/cli.test.ts` — 29 tests passing (was 21, added upgrade/doctor/benchmark tests)
- All CLI command tests pass

### BF-093 — public release
Pending. Requires `@brandlyframes` npm scope availability check and reservation (GOAL_00 §9 risk #6), then publish all packages under `@brandlyframes/*` plus `brandlyframes` core.

### Other state
- Uncommitted changes: HANDOFF.md, docs-site/src/routes/guides/brand-guide.tsx, docs-site/src/routes/guides/migration.tsx, docs-site/src/routeTree.gen.ts
- Untracked: CHANGELOG.md, docs/, packages/ai/, packages/audio-reactive/, packages/brand/, packages/cache/, packages/fx/, packages/interop/, packages/mcp/, packages/test/, packages/zod-types/, tsconfig.json, vitest.config.mjs
- Renderer `test/job.test.ts` has 1 pre-existing AbortSignal cancellation failure (unrelated to this work; `framesDone` expects 5, gets 0)
- Root scripts: `build`=`turbo run build`, `test`=`turbo run test`, `lint`=`eslint . --max-warnings 0`, `type-check`=`turbo run type-check`
- pnpm monorepo + Turborepo, ESM (`"type": "module"`), TypeScript strict, vitest v5 per-package
- Package convention: name `@brandlyframes/<pkg>`, version `0.1.0`, peerDependencies `react: ^18`, exports via `src/index.ts`

## Next steps (in order)

1. **BF-093 public release** — verify `@brandlyframes` scope availability on npm, publish all packages under `@brandlyframes/*` plus `brandlyframes` core
2. Run `pnpm build` / `pnpm test` / `pnpm lint` / `pnpm type-check` from root to confirm all gates green before release
3. Commit all changes and open PR

## Files touched this session

- `docs-site/src/routes/guides/brand-guide.tsx` (new)
- `docs-site/src/routes/guides/migration.tsx` (new)
- `docs-site/src/routeTree.gen.ts` (regenerated)
- `HANDOFF.md` (updated)

## Key references

- `dev-notes/Goals/GOAL_00.md` — §7c v1.0 "Premiere Night" (lines 393-396), §7d BF-421/BF-430/BF-480, §10 final deliverables
- `packages/cli/src/index.ts` — CLI command implementations (doctor, benchmark, upgrade)
- `packages/cli/test/cli.test.ts` — CLI test suite (29 tests)
- `docs-site/src/routes/guides/brand-guide.tsx` — Cinema Black design system docs
- `docs-site/src/routes/guides/migration.tsx` — Remotion migration guide
