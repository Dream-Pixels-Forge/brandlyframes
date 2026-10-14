# Run log — P0 Foundation scaffold [BF-001]

> Worker run: `f851ac6f-b075-4dba-96de-2cd0639a026b` (timed out at 30 min mid-verification;
> resumed by orchestrator as `cf9b1bec` to verify + commit).
> Task source: `dev-notes/workflows/v01-slate.js` (T_P0). Source of truth: `dev-notes/Goals/GOAL_00.md` §5/§7/§8.

## What was created

```
brandlyframes/
├─ package.json                  # private monorepo root; workspaces packages/*; pnpm@11.5.1; node >=24
│                                # scripts: build/test/lint/type-check/format/dev
├─ pnpm-workspace.yaml           # packages/* + onlyBuiltDependencies: [esbuild]
├─ .gitignore                    # node_modules, dist, coverage, .turbo, .env* (!.env.example), *.log, .DS_Store
├─ .prettierrc.json              # semi, singleQuote, trailingComma all, printWidth 100
├─ .prettierignore               # node_modules, pnpm-lock.yaml, dist, coverage, .turbo, dev-notes/
├─ eslint.config.mjs             # flat config: @eslint/js + typescript-eslint recommended + prettier compat
├─ tsconfig.base.json            # strict, ES2022, ESNext, bundler, react-jsx, skipLibCheck,
│                                # forceConsistentCasingInFileNames, isolatedModules, noEmit
├─ turbo.json                    # tasks build/type-check/lint/test/dev; dependsOn ^build; outputs [] in P0
├─ .changeset/config.json        # fixed lockstep group: [brandlyframes, @brandlyframes/*]; baseBranch main
├─ LICENSE                       # MIT — Copyright (c) 2026 Dream-Pixels-Forge
├─ README.md                     # mission one-liner, layout, clean-room note
├─ AGENTS.md                     # Turborepo-managed agent-guidance block (auto-added by turbo; kept)
├─ .github/workflows/ci.yml      # PR → main: pnpm/action-setup v4 (11), Node 24 + pnpm cache,
│                                # install --frozen-lockfile → type-check → lint → build → test;
│                                # concurrency cancel-in-progress
└─ packages/core/
   ├─ package.json               # name "brandlyframes" v0.1.0, type module, exports → src/index.ts (dev)
   │                             # peerDeps react ^19; deps zod; devDeps react, react-dom, @types/react,
   │                             # typescript, vitest, tsx
   ├─ tsconfig.json              # extends ../../tsconfig.base.json (src, test, vitest.config.ts)
   ├─ vitest.config.ts           # node env, test/**/*.test.ts
   ├─ src/index.ts               # placeholder: export const BRANDLYFRAMES_VERSION = '0.1.0'
   └─ test/smoke.test.ts         # asserts the version string (1 passing test)
```

Resolved versions (pnpm 11.5.1, latest stable at install time): turbo 2.11.7, eslint 10.12.0,
@eslint/js 10.0.1, typescript-eslint 8.71.2, prettier 3.9.10, typescript 5.9.3, vitest 5.0.4,
tsx 4.23.15, zod 4.6.7, react / react-dom / @types/react 19.3.0.

## Decisions (all tooling-level, no scope change)

1. **TypeScript pinned to ^5 (5.9.3).** `pnpm add` first resolved typescript 7.0.2 (new native
   compiler), but typescript-eslint 8.71.2 requires `>=4.8.4 <6.1.0` (`pnpm peers check` failed).
   Pinned `typescript@^5` at root and in core; peers clean afterwards.
2. **esbuild build script approved** via `onlyBuiltDependencies` in `pnpm-workspace.yaml`
   (pnpm 11 blocks postinstall scripts by default; esbuild ships platform binaries as
   optionalDependencies and only validates them in postinstall).
3. **turbo build/test `outputs: []` for P0.** Per-package build is `tsc --noEmit` (task-allowed)
   and tests emit no coverage dir; declaring dist/coverage outputs produced turbo warnings.
   Flip to `outputs: ["dist/**"]` when real bundling lands (P2, BF-010).
4. **dev-notes/ excluded from ESLint and Prettier.** Governance notes and
   `dev-notes/workflows/*.js` orchestration scripts are not lint/format targets.
5. **`.gitignore` negates `!.env.example`** so the future documented env template is committable
   (SECURITY.md §1) while `.env*` stays ignored.
6. **Lint negative probe:** a temp TS file with an unused var failed `pnpm lint` as expected,
   proving ESLint 10 actually lints workspace `.ts` files; probe removed.
7. **AGENTS.md at root** is Turborepo's automatic agent-guidance block (written by turbo on first
   run when an agent is detected). Kept and committed per its own instruction.

## Command results

| Command | Result |
|---|---|
| `git init -b main` + `git add -A` + `git commit` | commit `115f6b3` "chore: import goal and governance notes" |
| `pnpm install` (root, then root tooling, then core deps) | exit 0; lockfile committed; peers clean |
| `pnpm type-check` | exit 0 — turbo: 1 task successful (`tsc --noEmit`) |
| `pnpm lint` | exit 0 — `eslint . --max-warnings 0` |
| `pnpm build` | exit 0 — turbo: 1 task successful (`tsc --noEmit`) |
| `pnpm test` | exit 0 — vitest: Test Files 1 passed (1), Tests 1 passed (1) |
| Fresh re-run (turbo cache cleared, all four sequential) | type-check 0 / lint 0 / build 0 / test 0 |
| `pnpm format` (prettier --write .) | exit 0; no churn in dev-notes (ignored) |

## Commits

1. `115f6b3` — chore: import goal and governance notes
2. *(this commit)* — feat: monorepo scaffold, tooling, CI [BF-001]

## Boundary compliance

- No P1 features implemented (placeholder `src/index.ts` only — no Composition/interpolate/spring/Sequence).
- `dev-notes/Goals/` untouched; no git remote added; nothing pushed.

## Next (P1, not in this run)

BF-002..BF-008 + BF-400/BF-401 per GOAL_00 §7c, TDD, after the P0 reviewer gate passes.
