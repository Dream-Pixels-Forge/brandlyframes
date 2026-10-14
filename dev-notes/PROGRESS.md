# Pipeline Progress — BrandlyFrames

## Current State
- Project: BrandlyFrames (programmatic video SDK, React → MP4)
- Source of truth: `dev-notes/Goals/GOAL_00.md`
- Started: 2026-10-13
- Pipeline Phase: 3 (Engineer) — **v0.1 "Slate" COMPLETE**; driving v0.2 "Projector" (P2)
- Status: in-progress (async workflow dispatched)

## Pipeline Completion (pipeline-orchestrator map)
- [x] Phase 1: Brainstorm — GOAL_00.md is the complete architecture vision (accepted)
- [x] Phase 2: Governance + Design — BRAINSTORM.md (145 ln), SPEC.md (188 ln), SECURITY.md (103 ln), DESIGN.md (95 ln, #FF6A00 verified) — worker run c566b9f1
- [x] Phase 3 (v0.1): P0 scaffold [BF-001] → gate PASS → P1 core TDD (BF-002..008, BF-400, BF-401) → integration → gate **PASS**

## Workflow run log
- Workflow 1e8d1dd8 (v0.1 round 1): governance-docs ✅; p0-scaffold ⏱ timed out (30 min) — lesson stored to memorius (try/catch runs.run; raise worker timeouts).
- Resume cf9b1bec: BF-001 completed — fresh green verification, commit a7211e9, log dev-notes/reports/p0-scaffold.md.
- Orchestrator P0 gate verification: PASS.
- Workflow a533b42a (v0.1 round 2, failure-safe): **COMPLETED, all 6 children green.**
  - p0-confirm: GATE PASS (one P2 finding: pnpm-workspace placeholder — fixed by orchestrator)
  - core-timing: TDD RED→GREEN, 126 tests, commit b80a0b3
  - core-animation: 139 tests, 100% branches, commit 195107a
  - core-registry: 101 tests, commit 075bb6d (deviations: tc() NTSC FF<round(fps); markers via calculateMetadata; random→utils)
  - p1-integrate: public API wired, coverage thresholds lines:90 per-glob (measured 100%), 366 tests / 29 files, commit f61922c
  - p1-gate-0: **GATE: PASS — no issues found**

## Goal-phase tracking (GOAL_00.md §7 / §7c)
- [x] P0 Foundation — **GATE PASSED** (commits 115f6b3, a7211e9 [BF-001])
- [x] P1 Core — **GATE PASSED** (commits b80a0b3, 195107a, 075bb6d, f61922c; 366 tests; 100% lines timing/animation) → **v0.1 "Slate" COMPLETE**
- [ ] P2 Studio (v0.2 "Projector") — **dispatched** (workflow v02-projector): design pkg (BF-013) → fonts (BF-410) → bundler (BF-010) → CLI+config (BF-014/015) **DONE** → studio shell+props editor+error overlay+frame inspector (BF-011/012/411/412) → integration → reviewer gate
- [ ] P3 Renderer (v0.3) → P19 (v3.0) — queued; dispatch only after previous gate passes

## Orchestration policy
- Subagent-driven + TDD mandatory (DPF rules): workers implement RED→GREEN→REFACTOR; reviewers hold gates; max 3 remediation rounds per gate, then escalate to orchestrator.
- One writer per cwd at a time; sequential writer passes.
- Anti-drift: version evolution + phase milestones stored in memorius (projects/brandlyframes); `BF-###` IDs cited in every commit.
- All worker run logs land in `dev-notes/reports/<stage>.md`.
- Reviewer children have no shell — orchestrator executes gate commands on supervisor request (pattern proven in P0/P1 gates).

## Blockers
- (none)

## Decisions Made
- Greenfield: pipeline started at Phase 2 (governance) since GOAL_00.md fully covers the brainstorm output.
- Bundler: esbuild (goal default; used by @brandlyframes/bundler from v0.2).
- pnpm 11.5.1 + Node 24 only (DPF standard); no npm/yarn/bun.
- TS pinned ^5.9.3 (typescript-eslint requires <6.1).
- vitest 5.0.4: coverage glob thresholds sit flat under `thresholds` (no `overrides` sub-object).
