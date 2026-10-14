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
- Workflow 1e8d1dd8 (v0.1 round 1): governance-docs ✅; p0-scaffold ⏱ timed out (30 min) — workflow script died at the rejected await (lesson stored to memorius: wrap runs.run in try/catch; raise timeout for install-heavy workers). Next round dispatches a failure-safe script.

## Goal-phase tracking (GOAL_00.md §7 / §7c)
- [ ] P0 Foundation — gate: `pnpm build && pnpm test` green in CI
- [ ] P1 Core — gate: 90%+ unit tests on timing/interpolate/spring + deterministic frame tests
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
