# Task: GOAL_00.md checkbox reconciliation for BF-090/091/092 (Phase I, docs-only)

## Repo
`/home/dimona/Dream-Pixels-Forge/Dev/Packages/brandlyframes` — branch `feature/bf-020-headless-capture`.

## Problem
`dev-notes/Goals/GOAL_00.md` lines ~393-395 (v1.0 "Premiere Night" section) still show unchecked boxes:

```
- [ ] BF-090 `create-brandlyframes` + 5 templates (incl. `frame-video-demo`)
- [ ] BF-091 Docs site, API reference, brand guide page, Remotion migration guide
- [ ] BF-092 `brandlyframes doctor`, upgrade, security review, perf report
- [ ] BF-093 Public release, `@brandlyframes` scope live
```

while `HANDOFF.md` (2026-10-19) claims BF-090/091/092 are **Complete** and only BF-093 pending. BF-090/091/092 are also referenced as complete in `dev-notes/PROGRESS.md` history and commits `d96009c` (v1.0 release), `efce1dc`, `75b7ec2`, `f7a7c00`.

## What to do
Verify each claim **against the repo itself**, not against HANDOFF.md, then tick or correct the GOAL_00 line so the file is honest:

- **BF-090**: `packages/create-brandlyframes/` exists; check template count and that `frame-video-demo` is among them (source of truth: the package's template dir / `--list` output). Its tests pass (verified today).
- **BF-091**: `docs-site/` builds + type-checks (verified today); check `docs-site/src/routes/guides/` for brand-guide.tsx and migration.tsx, `docs/API.md` + `docs/getting-started.md` exist. Judge whether "API reference" (generated) is genuinely present or still pending — if pending, tick with an inline annotation like `*(API reference generation pending)*` matching the existing annotation style used elsewhere in the file.
- **BF-092**: `packages/cli/src/index.ts` implements `doctor`, `upgrade`, `benchmark`; `packages/cli/test/cli.test.ts` has tests for them. Security review / perf report: check `dev-notes/SECURITY.md` and `dev-notes/reports/` for evidence; if the "security review" deliverable has no artifact, say so in the annotation.
- **BF-093**: remains `[ ]` — do not tick (npm scope `@brandlyframes` and name `brandlyframes` are both unclaimed, but nothing is published).

Also fix any **contradiction you find between GOAL_00 and reality in those three lines only**. Do not rewrite other sections; keep the file's existing annotation style (`*(...)*` suffix notes).

## Boundaries
- Docs-only: touch `dev-notes/Goals/GOAL_00.md` (and, only if strictly necessary to correct a false claim, note the discrepancy in your report rather than editing other files).
- Do NOT touch code, tests, HANDOFF.md, or docs-site source.
- Commit locally on the current branch: `docs(goals): reconcile BF-090/091/092 checkboxes with repo reality (ISS-0094)`. Do not push.

## Verification
- Every ticked box backed by a file path you actually inspected; list those paths in your reply.
- `git status` clean except your commit.
