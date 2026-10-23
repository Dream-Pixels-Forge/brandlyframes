# Task: brandlyframes CI — undeclared (phantom) package imports, full sweep (Phase I)

## Repo
`/home/dimona/Dream-Pixels-Forge/Dev/Packages/brandlyframes`, branch `feature/bf-020-headless-capture`. CI bring-up (ISS-0104) — CI now passes Install/Type-check/Lint/Build and fails at **Test**.

## Current CI failure (run 39520688257, Test step)
```
@brandlyframes/transitions:test  RUN v3.2.7 .../packages/transitions
Error: Cannot find package 'react-dom/server' imported from .../packages/transitions/test/crossfade.test.tsx
(repeated for slide.test.tsx, wipe.test.tsx) → transitions#test exited 1
```

## Root cause (verified — same phantom class as ISS-0104's @types/node)
- `packages/transitions` imports `react-dom/server` in tests but does NOT declare `react-dom` (devDeps: design, frames, @testing-library/react, @types/react, react, typescript, vitest).
- Locally it resolves from the developer's **home directory**: `/home/dimona/node_modules/react-dom` (outside the repo). CI's clean checkout has no such ancestor → fails.
- Packages importing `react-dom` somewhere in `src/**`/`test/**`: `core`, `design`, `frames`, `transitions` (grep verified). At least `transitions` is missing the declaration; the others must be verified, and **other undeclared imports of the same kind may exist anywhere in the 34 packages** — this task is the full sweep, not a one-package patch.

## Method
1. **Detect**: for every package (`packages/*`, `docs-site`), extract all bare imports (`from '...'`, `import('...')`, `require('...')`, plus `/// <reference` and `types:` arrays in tsconfig if they name packages) from `src/**` and `test/**` (also `templates/**` for `create-brandlyframes` only if they are part of its own type-check/test runs — otherwise skip; templates are standalone scaffolds). For each bare specifier's package name (`@scope/name` or first segment; handle `node:*` → built-in, ignore), check it is declared in that package's `package.json` under `dependencies`, `devDependencies`, `peerDependencies`, or `optionalDependencies`. Also treat workspace-internal `@brandlyframes/*` as OK only if declared (transitions correctly declares its workspace deps — but check all).
   - Script this (node one-off script is fine — you may create it in /tmp, NOT in the repo).
   - Exclude type-only ambient things that TS resolves via `@types/*` only if the corresponding runtime package is genuinely absent — in doubt, declare the real package.
2. **Report the full matrix**: package → undeclared import → where used (src/test) → proposed dep + kind (dependency vs devDependency: runtime `src` usage → `dependencies` unless it's react/react-dom-style peer → `peerDependencies`+`devDependencies` matching how sibling packages already declare it — **mirror existing conventions in this repo**, e.g. how `core` declares react-dom if it does).
3. **Fix**: `pnpm add` / `pnpm add -D --filter <pkg>` for each missing package, version aligned with what the repo already uses (react-dom `^18` to match react `^18.3.0`, etc.). Keep lockfile changes minimal and intentional.
4. **Phantom-proof verification** (CI has no `/home/dimona/node_modules`):
   - After install, for each fixed package verify the module exists in ITS OWN node_modules (`ls packages/<p>/node_modules/<dep>`).
   - Full gates: `pnpm build` (34/34), `pnpm type-check` (40/40), `pnpm lint` (0), `npx turbo run test --continue --force` (67/67).
   - **Strong proof (do it):** run the previously-failing test in an environment where home is invisible — e.g. `cd packages/transitions && env -u NODE_PATH node --experimental-permission... ` is overkill; simpler: temporarily rename is FORBIDDEN (home dir is shared). Instead: `cd packages/transitions && npx vitest run` after confirming `node_modules/react-dom` exists locally in that package, and additionally prove resolution origin with `node -e "console.log(require.resolve('react-dom/server', {paths:['./test']}))"` run with cwd=packages/transitions — the printed path must be INSIDE `packages/transitions/node_modules` (or the pnpm store via that package's node_modules), never `/home/dimona/node_modules`. Do the same check for every package you fixed.
5. `git status`: only package.json files + pnpm-lock.yaml.

## Boundaries
- Do NOT touch `/home/dimona/node_modules`.
- Do NOT touch `.github/workflows/ci.yml`.
- Do NOT refactor test/source code — dependency declarations only (if an import is genuinely dead/unused, report it, don't delete it here).
- No version bumps of already-declared deps.
- One commit locally: `fix(ci): declare phantom imports explicitly — react-dom and friends [ISS-0104]`. Do NOT push.

## Report
- Full detection matrix (even rows that needed no fix).
- `require.resolve` outputs proving package-local resolution for each fix.
- Gate tails. Commit hash.
