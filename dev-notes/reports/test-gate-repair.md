# Run log — test-gate repair (Phase I) [ISS-0091..ISS-0093]

> Repair pass for `feature/bf-020-headless-capture`. Scope: only the 12 failing
> test tasks out of 67 from `npx turbo run test --continue --force`. No
> docs-site, GOAL_00.md, HANDOFF.md, CI, or turbo/pnpm config touched. Local
> commits only — nothing pushed.

## What was done

### ISS-0091 — vitest cannot start in 9 packages (fonts, lottie, motion-blur, noise, paths, shapes, three, transitions, webcodecs)

**Root cause (refined from the spec):** the true correlation is not
vitest-major-version alone — it is *vitest ^3.1.0 **without** a local
`vitest.config.ts`*. All 12 passing ^3.1.0 packages (ai, audio-reactive,
brand, cache, fx, interop, mcp, test, zod-types + core/design/player) have a
local config; the 9 failing ones had none. Without a local config, vitest
walks up and loads the repo-root `vitest.config.mjs`, which it compiles into
`<root>/node_modules/.vite-temp/*.mjs`; from there `import 'vitest/config'`
cannot resolve because the root has no `vitest` devDependency. Vitest 5
packages resolve this differently, which is why version ^5.0.4 no-config
packages (cli, renderer, …) load the root config fine.

**Fix (option a — least churn, repo-consistent):** added
`packages/<pkg>/vitest.config.ts` to each of the 9 packages, an exact copy of
the config the other ^3.1.0 packages already use:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
  },
});
```

No version bumps, no root dependency changes. Verified: all 9 packages'
`pnpm test` green (fonts 28, lottie 20, motion-blur 12, noise 16, paths 17,
shapes 12, three 11, transitions 39, webcodecs 55 — all passed).

### ISS-0092 — stale `0.1.0` version assertions (cli, create-brandlyframes)

**Root cause:** `packages/cli/test/cli.test.ts:16` and
`packages/create-brandlyframes/test/cli.test.ts:23` asserted
`--version` output equals the literal `'0.1.0'`; both packages are `1.0.0`
since the v1.0 release commit `d96009c`.

**Fix:** assert against the package's own `package.json` version
(future-proof — no re-break at the next bump). The cli test already loaded
its package.json; the create-brandlyframes test now does the same via the
`readFileSync` it already imported. Repo-wide grep for hard-coded `0.1.0`
expectations found two other hits, both intentionally left alone:

- `packages/core/test/smoke.test.ts:6` — asserts core's exported
  `BRANDLYFRAMES_VERSION` constant, which genuinely *is* `'0.1.0'`; test
  passes, not stale.
- `docs-site/**` — separate docs task in flight; out of scope per boundaries.

Verified: cli 29/29, create-brandlyframes 12/12 pass.

### ISS-0093 — renderer AbortSignal cancellation tests (flaky, not a product bug)

**Root cause analysis:** the sweep failure was
`AssertionError: expected 1 to be 5` at `job.test.ts:344` (`framesDone`). The
source (`packages/renderer/src/job.ts`) is correct — cancellation, partial
manifest recording and `RenderJobAbortedError` all behave per the BF-024
contract; the third test in the suite (pre-aborted signal) always passed and
all other job tests pass deterministically.

The bug was in the **test synchronization**: both failing tests used
`await delay(5); controller.abort();` — a wall-clock race hoping that frames
0–4 (resp. frame 0) would be captured within 5 ms before the abort landed.
Under turbo's parallel load the event loop is starved, so the abort fired
after only 1 frame completed (`framesDone` 1, not 5). Timing-dependent tests
of async orchestration are inherently flaky on loaded CI machines.

**Fix (test-only, per the spec's escape clause — expectation preserved, not
loosened):** replaced the `delay()` races with deterministic promise
handshakes. The fake tab signals when the target frame (5 / resp. 1) is
*provably in flight*, the test aborts, then releases the stall; the tab then
observes `signal.aborted` and throws `interrupted` exactly as before. All
assertions are unchanged (`framesDone === 5`, seeks `[0..4]`, manifest
`[{start:0,end:5}]`, no chunk beyond the interrupted one, launcher closed).
The now-unused `delay` helper was removed (my change made it orphaned).

Verified: 5 consecutive local runs + 2 consecutive full turbo sweeps
(`--continue --force`) — 67/67 green, no flakes.

## Verification (final, all green)

```
pnpm build          → Tasks: 34 successful, 34 total
pnpm type-check     → Tasks: 40 successful, 40 total
pnpm lint           → clean exit (eslint . --max-warnings 0)
turbo run test --continue --force (×2)
                    → Tasks: 67 successful, 67 total (both runs)
```

## Commits (local, branch `feature/bf-020-headless-capture`)

1. `fix(test): add local vitest configs to 9 vitest-3 packages [ISS-0091]`
2. `fix(test): assert CLI --version against package.json, not stale 0.1.0 [ISS-0092]`
3. `fix(test): make renderer AbortSignal cancellation tests deterministic [ISS-0093]`
