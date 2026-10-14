# Governance docs — worker report

Task: distill `dev-notes/Goals/GOAL_00.md` into four governance docs.

## Files written

1. `dev-notes/BRAINSTORM.md` — mission + principles (§1–2), package map
   (§3.1), pipeline diagram (§3.3) with the FrameStore delta, build-agent
   roles (orchestrator / TDD worker / gate reviewer, aligned with phase gates
   and BF-### tracking), key decisions (esbuild+Vite, pnpm+Turborepo,
   Vitest+Playwright, Changesets fixed lockstep, MIT/Apache-2.0, clean-room),
   risks & mitigations (§9, 7 rows).
2. `dev-notes/SPEC.md` — repo tree (§5), concept mapping table (§3.2),
   FrameVideo public API + contract requirements (§4.2/§4.3), core module
   boundaries (context+timing / components / animation / registry / runtime /
   utils with dependency direction), testing standards (§8), DoD gates P0–P8
   (§7) + phase→version map, version tracking rules (§7c, 7 rules).
3. `dev-notes/SECURITY.md` — secrets policy, project-root file sandbox,
   remote URL validation (BF-428/BF-423), no code exec from props
   (+ BF-475 multi-tenant), telemetry opt-in only, GitHub Secrets not
   variables, pnpm audit policy, dependency pinning (BF-430), disclosure.
4. `dev-notes/DESIGN.md` — Cinema Black: exact token table
   (#0A0A0A / #111111 / #1A1A1A / #2A2A2A / #8A8A8A / #FAFAFA / #FF6A00 /
   #FF8533 / #FF6A0026), ~5% accent rule, typography (Bebas Neue or Oswald,
   Inter, JetBrains Mono tabular HH:MM:SS:FF), cinema motifs, component
   list, applied-to list (incl. CLI ANSI 208 / #FF6A00, NO_COLOR),
   deliverables (Style Dictionary CSS/TS/JSON, Storybook, brand guide,
   Figma/Paper export).

## Boundaries respected

- Only the four docs (+ this report) were written. No code, no installs,
  no git commands, no other files touched.
- All values traced to GOAL_00.md; no invented token values or API names.

## Validation performed

- All four files exist under `dev-notes/`.
- Each file ≥ 80 lines (`wc -l`).
- `DESIGN.md` contains the literal string `#FF6A00`.
