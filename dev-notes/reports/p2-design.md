# Run log — P2 design package [BF-013]

> Worker pass for v0.2 "Projector" step 1 (packages/design). Scope honored:
> only `packages/design/**` + root `pnpm install` (lockfile). `packages/core`
> and root config untouched.

## What was done

1. **Scaffold** — `packages/design` as `@brandlyframes/design` 0.1.0, type
   module, `peerDependencies: react ^19`, devDeps react/@types/react(+dom)/
   typescript/vitest (same ranges as core; react-dom added because the
   required SSR determinism tests need `react-dom/server`). Exports `.`,
   `./tokens.css`, `./tokens.json`. `pnpm-workspace.yaml` already globs
   `packages/*` — no root config change; `pnpm install` linked the workspace
   (3 projects) and updated `pnpm-lock.yaml`.
2. **TDD RED** — 4 test files written first (`tokens`, `contrast`, `ssr`,
   `Button`); `vitest run` failed 4/4 on missing modules before any src
   existed.
3. **TDD GREEN** — implemented:
   - Tokens in three synced forms with exact DESIGN.md §2 values:
     `src/tokens.css` (`:root` dark default + `[data-theme='paper']` light
     inverse, paper values chosen as inverse with AA-verified text pairs),
     `src/tokens.ts` (`designTokens` const map + `DesignTokenName`/
     `DesignTokenValue` types + `cssVar()` helper), `tokens.json` flat map.
   - `src/typography.ts` — display/UI/mono font stacks + `monoNumeric`
     (tabular-nums rule, DESIGN.md §4; webfont loading itself is BF-410).
   - `src/contrast.ts` — pure `hexToRgb01`, `relativeLuminance`,
     `contrastRatio` (WCAG 2.x, 0.04045 threshold).
   - 9 components, styled via `var(--bf-…)` inline styles, hover states via
     React state (deterministic SSR, no generated ids): Button
     (primary/secondary/ghost), Panel, Tabs, Tooltip, Toast (icon glyph +
     role alert/status — never color alone), Progress (bar + clapper),
     FrameCounter (`FRAME 0042 / 0300`), TimecodeInput (`HH:MM:SS:FF`,
     aria-invalid), LogoLockup (orange `[ ]` SVG mark + wordmark).
   - `src/index.ts` public API with TSDoc on every export; no `any`.
4. **RED caught a real bug** — TimecodeInput destructure read `SS` where
   `FF` was needed; test `00:00:00:30` (FF=30 ≥ fps 30) failed, fixed
   `[, , minutes, seconds, frames]`. Also corrected one wrong test
   expectation (React always renders `aria-invalid="false"` for valid
   input — asserted explicitly now).
5. **Docs** — `packages/design/README.md`.

## Golden contrast values (independently computed, asserted in tests)

| Pair | Ratio | Gate |
|---|---|---|
| #FFFFFF / #000000 | 21:1 | golden |
| white #FAFAFA on black #0A0A0A | 18.968 | AA ≥ 4.5 ✓ |
| muted #8A8A8A on surface-1 #111111 | 5.470 | AA ≥ 4.5 ✓ |
| white on surface-2 #1A1A1A | 16.675 | AA ≥ 4.5 ✓ |
| black on orange (primary Button) | 6.895 | AA ≥ 4.5 ✓ |
| orange on black | 6.895 | **accent-only** by DESIGN.md §3 (≤ ~5% of screen), documented |
| white on orange | 2.751 | fails AA → primary Button uses black-on-orange |

Paper theme pairs also asserted ≥ 4.5 (parsed from `[data-theme='paper']`).

## Command results (exit codes verified)

| Command | Result |
|---|---|
| `pnpm vitest run` (packages/design) — RED phase | 4 files failed (missing src) — as expected |
| `pnpm vitest run` (packages/design) — GREEN | 4 files, 54 tests passed |
| `pnpm type-check` (root) | exit 0 |
| `pnpm lint` (root, `--max-warnings 0`) | exit 0 |
| `pnpm build` (root, turbo) | exit 0 (2/2 tasks) |
| `pnpm test` (root, turbo) | exit 0 (4/4 tasks) |

Banned-pattern grep over `packages/design/src`: no `Math.random` /
`Date.now` / `performance.now` (only TSDoc mentions of the guarantee).

## Notes for orchestrator

- Changeset not added (`.changeset/` is outside this task's file boundary) —
  BF-013 changeset needed before v0.2 release per GOAL_00 §7c rule 2.
- `dev-notes/PROGRESS.md` + workflow file left to the orchestrator.
