# Task: brandlyframes test-gate repair (Phase I)

## Repo
- Path: `/home/dimona/Dream-Pixels-Forge/Dev/Packages/brandlyframes`
- Branch: `feature/bf-020-headless-capture` (ahead 10, working tree clean, remote `origin` = github.com/Dream-Pixels-Forge/brandlyframes)
- Stack: pnpm 11.5.1 + Node 24 + Turborepo monorepo, 34 packages, TypeScript strict, vitest per package, ESM.
- Rules: pnpm only (never npm/yarn/bun), TDD (RED→GREEN→REFACTOR), surgical changes only, conventional commits citing `BF-###` or issue IDs (`ISS-0091`..`ISS-0093`).

## Current gate state (verified 2026-10-20 by coordinator)
- `pnpm build` → 0 (green)
- `pnpm type-check` → 0 (green)
- `pnpm lint` → 0 (green)
- `pnpm test` → RED. Full sweep `npx turbo run test --continue --force` shows 12 failing test tasks out of 67:
  `@brandlyframes/{cli,fonts,lottie,motion-blur,noise,paths,renderer,shapes,three,transitions,webcodecs}#test` and `create-brandlyframes#test`

Full logs from the sweep: `/tmp/opencode/bf-test3.log` (also `/tmp/opencode/bf-build.log`, `/tmp/opencode/bf-tsc.log`, `/tmp/opencode/bf-lint.log`).

## Root cause 1 — 9 packages: vitest cannot start (ISS-0091, high, blocking)
Packages: `fonts, lottie, motion-blur, noise, paths, shapes, three, transitions, webcodecs`

Error (identical for all 9):
```
Startup Error
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vitest' imported from
  <repo-root>/node_modules/.vite-temp/vitest.config.mjs.timestamp-<ts>-<hash>.mjs
```

Diagnosis (verified by scanning all 34 packages):
- These 9 packages have **no local `vitest.config.*`** AND pin `vitest: ^3.1.0` in devDependencies.
- With no local config, vitest walks up and loads the **root** `vitest.config.mjs`:
  ```js
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: {
      include: ['packages/*/test/**/*.{test,spec}.{ts,tsx}'],
      environment: 'node',
      globals: true,
    },
  });
  ```
  That import resolves from the repo root, where `node_modules/vitest` is **ABSENT** (root package.json has no vitest devDep).
- Passing `no-config` packages (`bundler, captions, cli, cloud, frames, gif, media-parser, media-utils, renderer, studio, whisper`) pin `vitest: ^5.0.4` and load fine — exact correlation: **failing = no local config + vitest ^3.1.0**.
- Root `node_modules/vitest` does not exist. Failing packages DO have `node_modules/vitest` locally (their own ^3.1.0).

Fix options (pick ONE, keep repo-wide consistent — recommend the least-churn one after investigating why vitest ^5.0.4 packages resolve the root config but ^3.1.0 ones don't; likely a vitest 3 vs 5 config-resolution difference):
- (a) add a local `vitest.config.ts` to each of the 9 packages mirroring their needs, or
- (b) bump the 9 packages to `vitest: ^5.0.4` (matches majority; check API compat of their tests + that pnpm install is run), or
- (c) add `vitest` to root devDependencies so the root config resolves.

## Root cause 2 — stale version assertions (ISS-0092, high, blocking)
- `packages/cli/test/cli.test.ts` and `packages/create-brandlyframes/test/cli.test.ts:23`
- `expect(output.trim()).toBe('0.1.0')` but packages are version **1.0.0** since v1.0 release commit `d96009c`.
- Message: `AssertionError: expected '1.0.0' to be '0.1.0'`
- Fix: read version from the package's own `package.json` and assert equality (future-proof), or at minimum update to `'1.0.0'`. Grep the repo for any other hard-coded `0.1.0` expectations.

## Root cause 3 — renderer AbortSignal tests (ISS-0093, medium, blocking)
- `packages/renderer/test/job.test.ts`, suite `runRenderJob — cancellation via AbortSignal [BF-024]`
- Failing (2):
  1. `stops the in-flight chunk, records the partial range and rejects with RenderJobAbortedError`
  2. `stops scheduling later chunks after an abort`
- Symptom: `framesDone` expects 5, gets 0. Pre-existing (documented in HANDOFF.md as unrelated to docs work).
- Third test in that suite (`rejects immediately without launching a browser when the signal is already aborted`) passes.
- Root-cause it properly: if it is a real product bug in BF-024 cancellation/resume logic, **fix the source, not the test**. Only adjust the test if the test itself encodes a wrong expectation — justify in the commit message.

## Verification (all must pass before done)
```bash
cd /home/dimona/Dream-Pixels-Forge/Dev/Packages/brandlyframes
pnpm build          # 0
pnpm type-check     # 0
pnpm lint           # 0 (--max-warnings 0)
npx turbo run test --continue --force   # 0 failed tasks (67/67)
```

## Boundaries
- Do NOT touch docs-site content, GOAL_00.md, HANDOFF.md (separate docs task in flight).
- Do NOT push or open/merge PRs — commit locally only on the current branch.
- Do NOT refactor unrelated code; one logical change per commit.
- Log a short run report to `dev-notes/reports/test-gate-repair.md` (conventions: see existing files there).

## Issues
- ISS-0091 (vitest startup, high, blocking)
- ISS-0092 (version assertion, high, blocking)
- ISS-0093 (renderer abort tests, medium, blocking)
