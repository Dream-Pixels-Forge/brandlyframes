# Run log — v0.2 core font loading [BF-410]

> Worker pass for v0.2 "Projector" — BF-410 "Font loading that just works"
> in `packages/core`. Scope honored: only `packages/core/src/fonts/**` +
> `packages/core/test/fonts/**` (plus this report). `src/index.ts`
> untouched — the integration pass owns public wiring (exports listed
> below). A prior run of this stage timed out; this pass completed it.

## What was done

1. **TDD RED** — test files first (`load-font.test.ts`, `use-font.test.tsx`,
   `font-harness.ts` fake environment); running `vitest run test/fonts`
   against a temporarily absent `src/fonts` failed both test files on
   missing modules (RED re-verified this pass by removing `src/fonts`,
   running, and restoring).
2. **TDD GREEN** — implemented `src/fonts`:
   - `environment.ts` — the browser seam (`FontFace` constructor,
     `document.fonts` add/delete, optional `fetch`) behind
     `getFontEnvironment()` with `setFontEnvironment()`/`resetFontEnvironment()`
     test injection; clear error naming the seam when neither exists (Node/SSR).
   - `load-font.ts` — `loadFont(family, url | GoogleFontSpec)` resolving when
     the FontFace is loaded and registered: direct URLs serialized into
     `url("…")` FontFace sources; Google specs build the
     `fonts.googleapis.com/css2` URL (family `+`-encoded, `wght@` /
     `ital,wght@1,<w>` axis, `display=swap`), fetch the stylesheet, extract
     the first font file URL, load with weight/style descriptors. Idempotent
     per family+request-URL via an in-flight/completed promise cache (one
     FontFace ever; duplicates never throw); failed attempts are evicted so a
     retry starts fresh. Timeout configurable via
     `LoadFontOptions.timeoutInMilliseconds` (default
     `DEFAULT_FONT_TIMEOUT_IN_MILLISECONDS` = 30 000 ms virtual — the render
     runtime patches `setTimeout`); timeout and load errors name the family
     and URL; failed faces are removed from `document.fonts`.
   - `mount-font.ts` — framework-free effect body: validates + starts the
     load *before* `holdFrame()` (no hold leak on sync error), hold labelled
     `font "<family>" (<url>)` with a same-duration timeout safety net,
     `releaseFrame()` exactly once on success/failure/unmount/auto-expiry,
     `onLoaded`/`onError` callbacks suppressed after unmount.
   - `use-font.ts` — `useFont(family, url, options?)`: triggers the load once
     per family+url (StrictMode remounts reuse the cached load), holds the
     frame until the font settles, returns the loaded state (`false` during
     SSR — effects never run there). Does not re-render on option changes.
3. **TDD REFACTOR** — `npx eslint` flagged `preserve-caught-error` on the two
   rewrap sites in `load-font.ts`; attached `{ cause: error }` (message text
   and behavior unchanged).
4. **Tests (26)** — fake FontFace/document.fonts/fetch harness in Node:
   local URL load + serialization + `document.fonts` add; no dangling timer
   after success; idempotency (concurrent + post-completion duplicates, one
   face, one `load()` call); distinct family/url → distinct loads; failure
   error naming family+URL + retry allowed; failed face deleted; timeout
   path with fake timers (default 30 s and configurable, error names
   family+URL+duration); invalid-argument errors; no-environment error;
   Google Fonts: css2 URL construction (weight/italic/space encoding),
   duplicate google loads re-fetch nothing, css2 failure statuses, empty
   stylesheet, rejecting fetch; `mountFontEffect`: hold present while
   loading + released on settle, error path, unmount release + callback
   suppression, idempotent cleanup, holdFrame auto-expiry survival,
   StrictStyle remount single-load, concurrent mounts independent holds,
   shared timeout; SSR: `renderToString` renders `loaded:false` with and
   without a font environment, zero holds, zero fetches/faces.

## New exports (for the integration pass — NOT yet in `src/index.ts`)

From `src/fonts` (module barrel `src/fonts/index.ts`):
`loadFont`, `useFont`, `mountFontEffect`, `clearFontCache`,
`DEFAULT_FONT_TIMEOUT_IN_MILLISECONDS`, `getFontEnvironment`,
`setFontEnvironment`, `resetFontEnvironment`, types `FontSource`,
`GoogleFontSpec`, `LoadFontOptions`, `UseFontOptions`,
`MountFontEffectOptions`, `FontEffectCleanup`, `FontEnvironment`,
`FontFaceLike`, `FontFaceSetLike`, `FontFaceConstructorLike`,
`FontFaceDescriptorsLike`, `FontFetchLike`, `FontFetchResponseLike`.
(Development/test seam `setFontEnvironment`/`resetFontEnvironment` may be
kept internal at wiring time; runtime holds come from the existing
`holdFrame`/`releaseFrame` exports.)

## Command results (exit codes verified)

| Command | Result |
|---|---|
| `npx vitest run test/fonts` (RED re-check, `src/fonts` removed) | 2 test files failed on missing modules — expected |
| `npx vitest run` (packages/core, GREEN) | 31 files, 392 tests passed |
| `npx vitest run test/fonts` | 2 files, 26 tests passed |
| `pnpm run type-check` (root, turbo) | exit 0 |
| `npx tsc --noEmit -p packages/core/tsconfig.json` | exit 0 |
| `npx eslint packages/core/src/fonts packages/core/test/fonts --max-warnings 0` | exit 0 (after cause fix) |

Banned-pattern grep over `packages/core/src/fonts`: no `Math.random` /
`Date.now` (only `setTimeout`, which the BF-420 virtual clock patches —
that is what makes the 30 s default "virtual").

## Notes for orchestrator

- Changeset not added (`.changeset/` outside this task's boundary) — BF-410
  changeset needed before the v0.2 release per GOAL_00 §7c rule 2.
- `src/index.ts` wiring, `dev-notes/PROGRESS.md` and the v0.2 workflow file
  belong to the integration pass (`dev-notes/workflows/v02-projector.js`
  exists untracked and was left untouched).
- `useFont` accepts a direct font file URL per the stage contract;
  GoogleFontSpec support via `useFont` can ride on `loadFont` later without
  breaking changes (mount body is source-agnostic if widened).
