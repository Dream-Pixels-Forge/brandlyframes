# Run log — P3 parallel tab capture [BF-020]

> Worker pass for v0.3 "First Take" (packages/renderer). Scope honored: only
> `packages/renderer/**` (+ this report). No other packages, docs-site, CI,
> or turbo/pnpm config touched. No real Chrome/ffmpeg in tests — fakes only.

## What was done

1. **TDD RED** — `packages/renderer/test/capture-parallel.test.ts` written
   first against a scripted fake launcher (fake tabs record their seeks,
   screenshot the current frame back as a one-byte PNG, per-launch failure
   scripting): 10 tests, all failing on the missing `captureParallel` export
   before any src change.
2. **TDD GREEN** — implemented in `packages/renderer/src/capture.ts`:
   - `captureParallel(options, launcherFactory)` — bounded parallel tab pool.
     Splits `[start, end)` via the existing `splitFrameRange`, then dispatches
     chunks across at most `min(concurrency, chunkCount)` tabs opened on one
     launcher (launcherFactory called once → one browser, N tabs). Workers
     pull chunks from a shared cursor; the pool is joined with
     `Promise.allSettled`, so one tab's failure never blocks the others.
     Result: `Uint8Array[]` PNG bytes per frame in frame order.
   - `DEFAULT_CONCURRENCY` = `min(availableParallelism(), 8)` (the required
     default for `concurrency`).
   - Recycle semantics: a failed chunk closes its tab, respawns a fresh tab,
     and retries that chunk once; a second failure ends the worker and is
     aggregated after the pool drains into one error
     (`captureParallel: N of M chunk(s) failed: …`) whose `cause` chains the
     first underlying failure (cause chain preserved through the per-frame
     wrapper → original tab error).
   - `chunkSize` option (default: range split evenly across the concurrency);
     validated like `splitFrameRange` (RangeError on non-integer/<1).
   - Internal helper `captureFramesOnTab` now shared by `captureChunk` and
     `captureParallel` — `captureChunk` behavior is byte-identical (same
     error strings, same raw screenshotPng propagation); `splitFrameRange`
     and `captureFrame` untouched.
3. **Exports** — `src/index.ts` re-exports `captureParallel`,
   `DEFAULT_CONCURRENCY`, and type `CaptureParallelOptions`. TSDoc on all
   public exports; no `any` in public API (verified in emitted
   `dist/capture.d.ts`).
4. **Tests** — 10 new, covering: in-order capture across 3 parallel tabs;
   default concurrency = `DEFAULT_CONCURRENCY` tabs for a 100-frame range;
   explicit concurrency override; pool never launches more tabs than chunks;
   URL/flags plumbing; failed tab recycled + chunk retried on the fresh tab
   (launch count 2, old tab closed, all 6 frames in order); recycled tab
   fails again → aggregate error with full cause chain; one worker's fatal
   failure doesn't stop the other tab (allSettled, 3 launches, surviving tab
   completes its chunk); invalid options rejected (concurrency 0/1.5, empty
   range, chunkSize 0).

## Gate results

| Gate | Command | Result |
|---|---|---|
| tests | `pnpm --filter @brandlyframes/renderer test` | ✅ 27 passed (3 files: 17 existing + 10 new), 0 failed |
| build | `pnpm --filter @brandlyframes/renderer build` | ✅ `tsc` clean |
| lint | `pnpm lint` | ✅ 0 warnings (`--max-warnings 0`) |

All green on round 1 (the one interim failure — a wrong failure-scripting
predicate in the new test's `failingTab` helper — was a test bug, fixed
before the final green run).

## Deviations / notes

- Naming: chose the `captureParallel` function (consistent with the existing
  `captureFrame` / `captureChunk` exports) over exporting a `TabPool` class;
  the pool is an internal worker loop, no extra public surface.
- "Respawn once" interpreted as: the failed chunk is retried once on the
  recycled tab; the second failure surfaces (locked by tests). A worker whose
  *initial* tab launch fails also counts as a failure (recorded, pool keeps
  draining, aggregate error) — a browser that cannot open tabs must surface.
- Pool opens all tabs on one launcher (one browser process, N tabs), matching
  the "N browser tabs" wording; recycle = `launchTab` again on the same
  launcher.
- `width`/`height` are accepted for API parity with `captureChunk` (same
  pass-through shape); like the existing primitives, the real Chrome backend
  (CLI wiring, still pending per GOAL_00 §7c) consumes them.
- `GOAL_00.md` BF-020 checkbox left unticked: CLI wiring is still pending and
  the checkbox lives outside this task's file boundary.
