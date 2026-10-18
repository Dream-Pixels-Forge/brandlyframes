# BrandlyFrames Handoff Document

**Date**: 2026-10-18
**Author**: Pi coding agent (session 5)
**Branch**: `feature/bf-020-headless-capture` (all session work committed; PR not yet opened)

---

## Summary

Resumed from the 2026-10-16 handoff and found its headline claims **aspirational**:
the "P3/P4/P7 complete, all gates green" state was not real. The actual state was:

- Last session's work (renderer capture, player, cloud, docs-site) sat **uncommitted**.
- **All four gates were red**: lint 164 errors, type-check failing, build failing (pnpm
  install exit 1 on unapproved esbuild build script), and the docs site never compiled
  at all (stale tsc CJS artifacts, wrong router API, Tailwind v3/v4 mismatch).

### Done this session

1. **docs-site repaired end-to-end** — it now type-checks and builds green:
   - Root route split: `createRootRoute` in `__root.tsx`, home moved to `routes/index.tsx`.
   - `NavLink` → `Link` + `activeProps` (TanStack Router has no NavLink).
   - Raw `<Component>` inline-code in JSX text → entities / string literals; literal
     `\uXXXX` escapes in JSX text → real characters; missing `</li>` restored.
   - `routeTree.gen.ts` now generated via `@tanstack/router-cli` (`tsr generate`),
     wired into `build`/`type-check` scripts and gitignored.
   - **Tailwind v3 → v4** (`@tailwindcss/vite`): CSS was authored in v4 syntax
     (`@import "tailwindcss"`, `@theme`) while v3 was installed. Theme gained the
     missing `--text-*` type scale, `--container-*` widths; `btn`, `input`, `card`,
     `badge`, `nav-link`, `toc-link`, `skeleton` hoisted to `@utility` (v4 requires
     this for `@apply` of custom classes); fade-in/slide-up/slide-down keyframes
     restored (were in the lost `tailwind.config.js`).
   - Stale compiled `.js` artifacts deleted; `@/` path alias added to vite config.
   - Broken links to never-built routes (`/guides`, `/examples`, `/docs/architecture`,
     `/docs/renderer`, `/guides/deployment`, `/api/<pkg>` subpaths) remapped to
     existing pages; external GitHub/npm links → plain `<a>`.
   - `docs-site` added to `pnpm-workspace.yaml`; `allowBuilds: esbuild: true`;
     `@tanstack/react-query-devtools` dependency added.
2. **All gates green**: lint 0 errors/warnings · type-check 0 errors (25 projects) ·
   build 24/24 · tests 1,069 passing.
3. **Committed in BF-referenced commits** on `feature/bf-020-headless-capture`:
   - `feat(renderer): headless Chrome capture primitives + chunking [BF-020]`
   - `feat(player): embeddable web player with ref API, controls, events [BF-030][BF-031]`
   - `feat(cloud): Lambda/CloudRun adapters, chunk orchestration, cost guard [BF-080][BF-081][BF-082]`
   - `fix(docs-site): make the docs site actually build and type-check [BF-091 partial]`
   - `chore: docs-site workspace member + esbuild allowBuilds + ignore generated route tree`
4. **Goal docs reconciled honestly** — `GOAL_00.md` §7c now carries partial-state
   annotations; `PROGRESS.md` has a session-5 entry.

## Quality Gates Status (verified 2026-10-18)

| Check | Status |
|-------|--------|
| **Lint** | ✅ 0 errors, 0 warnings |
| **Type-check** | ✅ 0 errors (25 workspace projects) |
| **Build** | ✅ 24/24 packages (incl. docs-site) |
| **Tests** | ✅ 1,069 passing |

---

## True phase state (do not trust older handoffs)

| Phase | Reality |
|-------|---------|
| P0/P1 (v0.1 core) | ✅ Complete, gated |
| P2 (v0.2 studio/bundler/design) | ✅ Complete |
| **P3 (v0.3 renderer)** | **OPEN — only BF-020 partial** (captureFrame/captureChunk/splitFrameRange + tests). No FFmpeg stitch (BF-021), no audio mixing (BF-022), no alpha (BF-023), no progress/cancel/resume (BF-024), no render/still/compositions CLI (BF-025), no golden-frame harness (BF-026). |
| **P4 (v0.4 player)** | Code + 9 tests landed (BF-030/031). Docs page and Next.js/plain-React examples (BF-032) missing. |
| P5 (v0.5 frames) | ✅ Complete except BF-061 (test clips + 4K benchmark). |
| P6 (v0.6 extras) | ✅ Complete (BF-071 all landed). |
| **P7 (v0.7 cloud)** | Code + 17 unit tests (adapters, chunking, cost, drift harness). **No real-credential integration tests, no 10-min drift run.** |
| **P8 (v1.0 release)** | docs-site builds (BF-091 partial). BF-090 (create-brandlyframes + 5 templates), BF-092 (doctor/upgrade/security/perf), BF-093 (public release) not started. |

---

## Next milestone: P3 completion (then P4/P7 verification, then P8)

Per `GOAL_00.md` §7 phases — do not advance until each phase gate passes.

| Task | ID | Notes |
|------|----|-------|
| Parallel tabs + render pipeline | BF-020 | captureChunk currently sequential; needs N-tab pool |
| FFmpeg stitching (h264/h265/vp8/vp9/prores/gif/png-seq) | BF-021 | |
| Audio mixing with volume curves | BF-022 | |
| Transparent background / alpha output | BF-023 | |
| Progress, cancellation, resumable chunks | BF-024 | |
| `render`, `still`, `compositions` CLI | BF-025 | |
| Golden-frame + determinism harness | BF-026 | |
| Player docs + examples | BF-032 | |
| Cloud integration verification | BF-080..082 | real-credential tests + 10-min drift run |

## Quick Start

```bash
cd Dev/Packages/brandlyframes
pnpm install
pnpm lint && pnpm type-check && pnpm build && pnpm test   # all green
cd docs-site && pnpm dev                                   # docs on :4321
```

### Key files

- `packages/renderer/src/capture.ts` — capture primitives (P3 start here)
- `packages/player/src/index.tsx`, `packages/cloud/src/index.ts` — landed P4/P7 code
- `docs-site/vite.config.ts`, `docs-site/src/styles/globals.css` — Tailwind v4 setup
- `dev-notes/Goals/GOAL_00.md` §7c — source-of-truth roadmap (annotated)
- `dev-notes/PROGRESS.md` — session log

## Conventions to keep following

- `BF-###` ID cited in every commit; one feature = one issue = one PR.
- Subagent-driven + TDD mandatory; reviewer children hold gates (no shell);
  orchestrator executes gate commands; worker run logs → `dev-notes/reports/`.
- A feature checkbox is ticked **only** when code+tests+docs+example+changeset land.
- Verify claims by running the gates — two handoffs in a row overstated completion.

---

*End of Handoff*
