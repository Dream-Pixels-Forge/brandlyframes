# HANDOFF — BrandlyFrames: v1.2.0 feature wave + creative-features backlog filed
> Status: **v1.2.0 versioned & gate-green; npm publish blocked on token** · Branch `main` @ b26f4ed · For new session
> Date: 2026-11-10

## 1. Current state
- **Shipped this session (7 feature commits, all on main, all pushed):**
  - **BF-501** film stock & chemical emulation — `packages/fx/src/film.ts` (3 stock presets, halation, gate weave, push/pull curves; 17 tests)
  - **BF-503** glitch & datamoshing — `packages/fx/src/glitch.ts` (`applyDatamosh`, `applyFrameDrop`, `applyChannelShift`; 14 tests)
  - **BF-504** volumetric light & particles — `packages/fx/src/particles.ts` (`ParticleSystem` snow/dust/embers, `applyGodRays`, `applyVolumetricDust`, `renderParticles`; 13 tests)
  - **BF-509/510** time-warp — `packages/frames/src/time-warp.ts` (`reverseFrame`, `pingPongFrame`, `layerFrame`, `layerTimeline`, `variableSpeedFrame`, `timeWarpFrame`; 20 tests)
  - **BF-514** L-system growth — `packages/procedural/src/growth.ts` (`lSystemGrowthPath`, plant/coral/lightning presets; 14 tests)
  - **BF-524** print+video — `packages/renderer/src/poster.ts` (`buildPosterPdf`, `pdfPageDimensions`, `estimatePosterPages`, `hashPosterPdf`; 16 tests) + `packages/cli` `poster` subcommand (3 tests, includes built-in PNG→RGBA decoder)
  - **BF-513** ticked (procedural pkg already shipped; 33 tests)
- **Backlog filed as GitHub issues #90–#96** (6 themed, covering the 26 remaining section-11 creative features) with a tracking table in `dev-notes/Goals/GOAL_00.md`:
  - #90 BF-502 · #91 BF-505/506/507/508 · #92 BF-511/512 · #93 BF-515–519 · #94 BF-520–523 · #95 BF-525–528 · #96 BF-529–533
- **Versioning:** `pnpm changeset version` ran → all 42 packages at **v1.2.0**, changelogs written, committed (`b26f4ed`). Full gate green: `type-check` 59/59, `build` 42/42, `test` 83 tasks, `lint` clean.
- **Not done:** The actual `npm publish` — **blocked on an npm automation token** (`npm whoami` → 401 in this environment). Everything is staged; only the credential + final registry verification are missing.

## 2. Remaining work (in order)
1. **Unblock publish:** set an npm automation token (`NPM_TOKEN`), then:
   ```bash
   pnpm build
   NPM_TOKEN=<token> pnpm changeset publish --access public
   ```
   (changesets config uses the fixed group `[brandlyframes, @brandlyframes/*]`; root is `"private": true` and auto-skips.)
2. **Three-way verify (AGENTS.md §8):** `npm view @brandlyframes/fx@1.2.0` etc. → code ↔ git tag ↔ registry all agree at 1.2.0; smoke-install one package in a fresh dir.
3. **Tag + push** the release: `git tag v1.2.0 && git push origin v1.2.0` + GitHub release.
4. **Next feature wave (issue #90, BF-502):** anamorphic & lens character — build `packages/fx/src/lens.ts` (bokeh-shape mask generator, horizontal flare streaks, focus breathing, blade-count DOF, vintage vignette) on the existing `applyLensDistortion` + fx pixel-math pattern; pure deterministic RGBA functions; vitest with byte-identical re-render; changeset; tick GOAL_00 BF-502. Same worktree + serial-merge workflow as this session.

## 3. Verified ground truth (read first)
- **Determinism contract:** every new module is `frame -> pixels` pure math — no `Math.random`, no wall clock, no GPU. Same `(frame, seed, options)` → byte-identical output. Tests assert this explicitly.
- **`fx` build gotcha (fixed this session):** a stray `tsc` run wrote `.js`/`.d.ts` into `packages/fx/src/` (outDir mis-resolution); removed in commit `b5cafc1`. `fx` builds to `dist/` via `tsconfig.build.json`. Re-check `git status` after any `fx` build.
- **Cross-package type re-exports:** new modules that use `FramePixels`/`LSystemConfig` must re-export those types (`export type { FramePixels }`) or `tsc --noEmit` fails with TS2459. This bit `film.ts`/`glitch.ts`/`particles.ts`/`growth.ts` once; all fixed.
- **npm staging vs publish:** prior handoff (2026-11-01) documented `npm stage publish` as the path. `changeset publish` (used here) is the standard changesets flow — confirm which the repo's CI/AGENTS.md mandates before the final publish; `changeset publish` respects `.changeset/config.json` (`access: "public"` is set).
- **Scope `@brandlyframes` is free on npm** (404 on all 42 names) — first-ever publish will create them.

## 4. Files changed / created this session
- New source modules: `fx/src/{film,glitch,particles}.ts`, `frames/src/time-warp.ts`, `procedural/src/growth.ts`, `renderer/src/poster.ts`
- New tests: `fx/test/{film,glitch,particles}.test.ts`, `frames/test/time-warp.test.ts`, `procedural/test/growth.test.ts`, `renderer/test/poster.test.ts`, `cli/test/cli.test.ts` (+3 poster cases)
- CLI: `packages/cli/src/index.ts` — `poster` subcommand + `decodePngToRgba`/`inflatePng` helpers
- Exports wired into each package's `src/index.ts`
- Changesets consumed by `changeset version`; version bump commit `b26f4ed` (86 files)
- GOAL_00: 7 items ticked (BF-501/503/504/509/510/513/514/524) + tracking table for issues #90–#96

## 5. How to verify when you land
```bash
cd /home/dimona/Dream-Pixels-Forge/Dev/Packages/brandlyframes
git status                 # expect clean tree on main @ b26f4ed
node -p "require('./packages/fx/package.json').version"   # expect 1.2.0
pnpm type-check            # 59/59
pnpm build                 # 42/42
pnpm test                  # 83 tasks, all passing
pnpm lint                  # clean (eslint --max-warnings 0)
gh issue list              # expect #90-#96 OPEN
npm whoami                 # expect 401 until a token is set (publish blocker)
```

## 6. Goal spec & verdict
- Goal (this session): implement the unchecked GOAL_00 items that are pure-deterministic-math slices, file the rest as issues, and prep the release.
- DoD: feature modules green-gated & merged; backlog navigable (issues + table); release versioned and one credential away from live.
- Verdict: **MET** for everything except the final registry publish, which is **BLOCKED on an npm automation token** (environmental, not code).

## 7. Environment facts
- Project root: `/home/dimona/Dream-Pixels-Forge/Dev/Packages/brandlyframes`
- Toolchain: Node v24.22.2, npm 11.19.1, pnpm 11.5.1 (workspace), turbo 2.11.7, changesets 3.0.3, vitest
- Remote: `origin https://github.com/Dream-Pixels-Forge/brandlyframes.git`, branch `main` @ `b26f4ed` (in sync with origin)
- Published version target: **1.2.0** (all 42 packages)
- npm auth: `npm whoami` → **401** (no token; this is the only blocker to BF-093)

**Next:** read this handoff, (a) drop in an npm automation token and run §2 items 1–3 to publish 1.2.0, then (b) open issue #90 and start BF-502 anamorphic lens character in a worktree.
