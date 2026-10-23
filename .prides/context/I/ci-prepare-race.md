# Task: brandlyframes CI — prepare-during-install build race (Phase I)

## Repo
`/home/dimona/Dream-Pixels-Forge/Dev/Packages/brandlyframes`, branch `feature/bf-020-headless-capture`, pushed; CI bring-up in progress (ISS-0104).

## Current CI failure (run 39517323299, `Install dependencies` step)
```
packages/media-parser prepare: src/index.ts(322,33): error TS2307:
  Cannot find module '@brandlyframes/webcodecs' or its corresponding type declarations.
npm error command sh -c tsc   →  [ELIFECYCLE] Command failed with exit code 2.
```

## Root cause (structural — verified)
- 10 workspace packages declare a **`prepare`** script (`"prepare": "npm run build"` or equivalent). pnpm executes `prepare` for workspace projects during `pnpm install`.
- Those builds consume workspace deps (`workspace:*`) through `package.json#exports`/`types` → `dist/index.d.ts`. In a **clean checkout** (CI, fresh clone) `dist/` does not exist yet, and pnpm does not build workspace deps in dependency order before running `prepare` scripts → TS2307.
- Locally everything passes only because `packages/*/dist` already exists from past builds (gitignored). **A fresh clone fails the same way** — this is not just a CI bug.
- The previous failure (`packages/cli` TS2580 `process`) was the sibling phantom-@types class, already fixed in `e71ea4c`.

## Chosen fix direction (investigate, then implement; push back with evidence if you find it wrong)
Convert install-time builds to pack-time builds: change `prepare` → **`prepack`** in the affected packages.
- `prepack` runs when a package is packed/published (what `prepare` was protecting), but NOT on every workspace install → removes the install-time race for CI and fresh clones.
- Verify per package that nothing depends on `prepare` running at install (search repo + `.github/` + changesets config for references: `publishConfig`, changesets `prepack`/`build` conventions, `create-brandlyframes` template wiring, `bin` fields consumed right after install).
- If any specific package genuinely must build on install, keep its `prepare` but make it build-safe (e.g. build only itself when its deps are already built) — justify in the report.

## Steps
1. Inventory: `grep -n '"prepare"' packages/*/package.json docs-site/package.json` — list all hits with their exact script bodies (some say `npm run build`, some `tsc ...`; note the npm-vs-pnpm detail but don't chase it unless it breaks).
2. For each: rename `prepare` → `prepack` (keep body identical). Do not touch packages without the script.
3. Clean-checkout simulation (this is the proof, locally):
   - `rm -rf packages/*/dist docs-site/dist .turbo packages/*/.turbo docs-site/.turbo` (all gitignored build artifacts — they are fully rebuildable; confirm via `git status` that nothing tracked is deleted).
   - `pnpm install --frozen-lockfile` → must exit 0 (previously this exact scenario failed CI).
   - `pnpm build && pnpm type-check && pnpm lint` → all exit 0.
   - `npx turbo run test --continue --force` → 67/67.
4. Confirm publish-path safety: with dists now absent, does `pnpm pack --filter <pkg>` (or `pnpm publish --dry-run --filter <pkg>` for one prepare-bearing package, e.g. `@brandlyframes/cli`) build correctly via prepack? Use dry-run only — NO real publish, NO `pnpm publish` without `--dry-run`.
5. `git status` → only intended `package.json` changes (+ nothing else).

## Boundaries
- No changes to `.github/workflows/ci.yml` (owned elsewhere; the install step stays `pnpm install --frozen-lockfile`).
- No dependency version changes, no lockfile changes (script fields don't affect pnpm-lock — if `pnpm-lock.yaml` DOES change, stop and report why).
- No refactors of build scripts beyond the rename (and only the exact safe edits above).
- Commit locally: `fix(ci): prepare → prepack, no install-time workspace builds [ISS-0104]`. Do NOT push.

## Report
- Table: package → old script body → action.
- Output tails of simulation steps 3 and the pack dry-run.
- Any package where you kept `prepare`, with justification.
- Commit hash.
