# Task: brandlyframes CI install failure — phantom @types/node (Phase I)

## Repo
`/home/dimona/Dream-Pixels-Forge/Dev/Packages/brandlyframes`, branch `feature/bf-020-headless-capture` (pushed; CI being brought up — issues ISS-0104 + child).

## Background
This repo's GitHub Actions CI had never run; it was just brought up and now fails at the `Install dependencies` step (`pnpm install --frozen-lockfile`). Run: https://github.com/Dream-Pixels-Forge/brandlyframes/actions/runs/39515955416

Failure (verbatim, `packages/cli prepare` lifecycle during install):
```
packages/cli prepare: src/index.ts(303,18): error TS2580: Cannot find name 'process'. Do you need to install type definitions for node?
... (many more process errors, lines 303-525)
npm error command sh -c tsc
[ELIFECYCLE] Command failed with exit code 2.
```

## Root cause (verified by coordinator — do not re-derive, but do verify your fix against it)
- `packages/cli/package.json` has **no `@types/node`** in devDependencies, but its source uses Node globals (`process`).
- Locally `tsc` passes only because TypeScript's default `typeRoots` walks **ancestor directories**, and `/home/dimona/node_modules/@types/node` exists **outside the repo** (developer home dir). Classic phantom dependency — CI (clean `/home/runner/work/...` checkout) has no ancestor `@types/node` → fails.
- Same class may affect OTHER packages: root `pnpm build`/`pnpm type-check` pass locally for the same phantom reason.

## Scope — find and fix the whole class, not just cli
1. **Scan all 34 packages** (`packages/*/` + `docs-site/`): for each, determine whether its `src/**` (and `test/**` for completeness) references Node globals/modules (`process`, `Buffer`, `__dirname`, `__filename`, `node:*` imports, `console` is fine — it's DOM+node but not the issue here) **AND** lacks `@types/node` in its own `package.json` devDependencies. Script this scan (grep + package.json read); report the full list.
2. Add `@types/node` (version `^24` to match Node 24 engines — match whatever version other packages already declare, e.g. `packages/ai/package.json`, for consistency) as a devDependency to every package in that list, using pnpm: run `pnpm add -D @types/node@^24 --filter <pkg>` from the repo root so `pnpm-lock.yaml` stays consistent (frozen-lockfile must pass).
   - Also check root `package.json`: if any root-level script (eslint config, tsconfig.base types) relies on it, decide accordingly; prefer per-package explicit deps (pnpm strict isolation) over root hoisting.
3. Watch out for **`prepare` scripts** (`packages/cli` has `"prepare": "npm run build"`, `create-brandlyframes` has one too): these execute during `pnpm install` in CI BEFORE any other step — every package with a prepare script must be buildable in a clean checkout on its own. Verify each.

## Verification (must all pass — and must be phantom-proof)
a. `pnpm install --frozen-lockfile` exits 0 **without rewriting pnpm-lock.yaml** (check `git status` after).
b. For each package you touched: confirm its local types now resolve without the home-dir phantom. Method: `cd packages/<p> && npx tsc --noEmit --typeRoots ./node_modules/@types` (forces ONLY the package's own typeRoots — if this passes, CI passes). For packages where `--typeRoots` changes semantics, instead verify `packages/<p>/node_modules/@types/node` exists after install and note it.
c. Full gates from root: `pnpm build` (34/34), `pnpm type-check` (40/40), `pnpm lint` (0 warnings), `npx turbo run test --continue --force` (67/67).
d. `git status` clean except intended changes (`package.json` files + `pnpm-lock.yaml`).

## Boundaries
- Do NOT modify `/home/dimona/node_modules` (shared by other projects).
- Do NOT touch `.github/workflows/ci.yml` (separate task owns it) unless you find a provable blocker there — report instead of editing.
- Do NOT bump unrelated dependency versions.
- No code refactors; dependency declarations + lockfile only (plus trivial tsconfig if a package genuinely needs `"types": ["node"]` — prefer the devDependency route).
- Commit locally (one logical commit): `fix(ci): declare @types/node explicitly per package — kill home-dir phantom [ISS-0104]`. Do NOT push.

## Report
- Table: package → needed? → action taken.
- Full output tails of a/b/c.
- Commit hash.
