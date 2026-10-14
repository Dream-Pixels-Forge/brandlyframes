# Pipeline Progress — BrandlyFrames

## Current State
- Project: BrandlyFrames (programmatic video SDK, React → MP4)
- Source of truth: `dev-notes/Goals/GOAL_00.md`
- Started: 2026-10-13
- Pipeline Phase: 3 (Engineer) — currently driving goal-phase P0+P1 (v0.1 "Slate")
- Status: in-progress (async workflow dispatched)

## Pipeline Completion (pipeline-orchestrator map)
- [x] Phase 1: Brainstorm — GOAL_00.md is the complete architecture vision (accepted)
- [x] Phase 2: Governance + Design — BRAINSTORM.md (145 ln), SPEC.md (188 ln), SECURITY.md (103 ln), DESIGN.md (95 ln, #FF6A00 verified) — worker run c566b9f1
- [ ] Phase 3: Engineer — P0 scaffold ~90% on disk (root tooling + packages/core + CI + changesets; turbo build/type-check/test logs green, tests 1/1); child timed out at 30 min before commit — resumed as cf9b1bec to verify + commit [BF-001]. Then: P0 reviewer gate → P1 core TDD (BF-002..008, BF-400, BF-401, 3 sequential passes) → integration → gate.

## Workflow run log
- Workflow 1e8d1dd8 (v0.1 round 1): governance-docs ✅; p0-scaffold ⏱ timed out (30 min) — workflow script died at the rejected await (lesson stored to memorius: wrap runs.run in try/catch; raise timeout for install-heavy workers).
- Resume cf9b1bec: BF-001 completed — fresh green verification of all 4 scripts, commit a7211e9, run log dev-notes/reports/p0-scaffold.md.
- Orchestrator P0 gate verification: PASS (scripts green, 2 commits, no P1 leak).
- Workflow a533b42a (v0.1 round 2, P1 core): running — failure-safe script (try/catch per stage, 65-min worker budgets, auto-retry, gate loop with 3 remediation rounds).
- P1 TDD passes committed: timing b80a0b3, animation 195107a, registry/runtime 075bb6d.
- Integration pass (worker): public API wired in src/index.ts (TSDoc on all exports, no `any`), vitest line-coverage thresholds >= 90% for src/timing/** + src/animation/** (measured 100%), cross-module frame-determinism tests added through the public entry, changeset + packages/core/README.md written. type-check/lint/build/test all exit 0; 366 tests / 29 files. Run log: dev-notes/reports/p1-integration.md.

## Goal-phase tracking (GOAL_00.md §7 / §7c)
- [x] P0 Foundation — **GATE PASSED** (orchestrator-verified 2026-10-14): type-check/lint/build/test all green, 2 commits (115f6b3, a7211e9 [BF-001]), no P1 leak, clean tree. TS pinned ^5.9.3 (typescript-eslint <6.1 constraint); turbo AGENTS.md guidance block kept.
- [ ] P1 Core — **integration done, awaiting reviewer gate** (workflow a533b42a): P0 reviewer confirmation ✅ → timing (BF-003/004) ✅ → animation (BF-005, 90% cov) ✅ → registry/runtime (BF-002/006/007/008/400/401) ✅ → integration ✅ → reviewer gate (3 rounds max) ⏳
- [ ] P2 Studio (v0.2) → P19 (v3.0) — queued; dispatch only after previous gate passes

## Orchestration policy
- Subagent-driven + TDD mandatory (DPF rules): workers implement RED→GREEN→REFACTOR; reviewers hold gates; max 3 remediation rounds per gate, then escalate to orchestrator.
- One writer per cwd at a time; sequential writer passes on packages/core.
- Anti-drift: version evolution stored in memorius (projects/brandlyframes); `BF-###` IDs cited in every commit.
- All worker run logs land in `dev-notes/reports/<stage>.md`.

## Blockers
- (none)

## Decisions Made
- Greenfield: pipeline starts at Phase 2 (governance) since GOAL_00.md fully covers the brainstorm output.
- v0.1 scope first: P0+P1 only; later versions dispatch after gates pass.
- Bundler: esbuild/Vite per goal default (§9 open question; finalized in P2).
- pnpm 11.5.1 + Node 24 only (DPF standard); no npm/yarn/bun.
