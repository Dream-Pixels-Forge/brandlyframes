# HANDOFF — BrandlyFrames: staged publishing prep (npm stage publish)
> Status: **research/verification complete, 0 of 41 packages staged yet** · Branch `main` @ d49b83d · For new session
> Date: 2026-11-01

## 1. Current state
- **Done:** Verified staged publishing is viable for this repo:
  - npm 11.19.1 (>= 11.15.0 required) ✅, Node v24.22.2 (>= 22.14.0 required) ✅
  - `npm whoami` → `dream-pixels-forge-creative` (authenticated, publish access) ✅
  - Clean git tree, branch `main` @ d49b83d `feat(procedural): add @brandlyframes/procedural package [BF-513]`
  - 41 publishable packages under `packages/*/`, all at version `1.1.0`, all names confirmed available on npm (registry returns 404 for each)
  - Root package `brandlyframes-sdk` is `"private": true` — do NOT stage/publish it
  - `@changesets/cli` configured, fixed group `[brandlyframes, @brandlyframes/*]` — changesets handle versioning; do NOT use `changesets publish` (bypasses staging)
- **Not done:** No package has been staged or published yet.

## 2. Remaining work (in order)
1. **Build** each package before staging (stage packs CWD as-is): `pnpm build` (turbo) or per-package build script.
2. **Stage** each non-private package from its own dir (`npm stage publish` is directory-aware, workspace-unaware):
   ```bash
   for d in packages/*/; do grep -q '"private": true' "$d/package.json" || (cd "$d" && npm stage publish); done
   ```
   Root is skipped by the private check.
3. **Review** staged packages (no 2FA): `npm stage list`, `npm stage view <stage-id>`, `npm stage download <stage-id>` then `npm install` the tarball locally to smoke-test.
4. **Approve** each staged package (2FA prompt — human step): `npm stage approve <stage-id>` (or npmjs.com Staged Packages tab → Approve).
5. **Verify on registry**: `npm view <name>@1.1.0`, `npm dist-tag ls <name>`, smoke install in fresh dir.
6. Tag + git push + GitHub release (per dpf-publisher flow).

## 3. Verified ground truth (read first)
- `npm stage publish` **refuses** `"private": true` packages — root `brandlyframes-sdk` auto-skips ✅
- **Contradiction to note:** npm man page says "Package must exist: The package ... must already exist on the npm registry" for staging. But Oct 2026 changelog says `npm stage publish` now supports creating new packages (public `0.0.0-stage` placeholder). All 41 names are free (404), so staging may either fail or create placeholders — **test on ONE package first** (`@brandlyframes/procedural` is newest/safest) before staging all 41.
- Staging does NOT prompt 2FA; **approving DOES** (CLI or npmjs.com). Plan the human 2FA step.
- `--tag` works like `npm publish` (default `latest`); use `--tag next` for prereleases.
- Versions are immutable on npm — if a stage/approve fails mid-version, bump again, never reuse 1.1.0.
- Changesets `updateInternalDependents: "always"` + fixed group means cross-deps version together; keep all 41 aligned at 1.1.0.

## 4. Files changed / created this session
- None (research/verification only; no code edits).

## 5. How to verify when you land
```bash
cd /home/dimona/Dream-Pixels-Forge/Dev/Packages/brandlyframes
git status           # expect clean tree
npm whoami           # expect dream-pixels-forge-creative
npm view brandlyframes  # expect 404 (not yet published)
npm stage list       # expect empty until staging begins
# After staging one package:
#   cd packages/procedural && npm stage publish
#   npm stage download <stage-id> && npm pack-compare / smoke install
```

## 6. Goal spec & verdict
- Goal: publish all 41 brandlyframes packages via `npm stage publish` + `npm stage approve`.
- DoD: every package at 1.1.0 live on npm with `latest` tag; tree clean; tags pushed.
- Verdict: **NOT-MET** (pre-flight verified, execution not started).

## 7. Environment facts
- Project root: `/home/dimona/Dream-Pixels-Forge/Dev/Packages/brandlyframes`
- Toolchain: Node v24.22.2, npm 11.19.1, pnpm 11.5.1 (workspace), turbo 2.11.7
- Remote: `origin https://github.com/Dream-Pixels-Forge/brandlyframes.git`
- Logged-in npm user: `dream-pixels-forge-creative`

**Next:** start a new session, read this handoff, then run step 2 item #1 (`pnpm build`) and stage a single test package before all 41.