# Run log — P3 FFmpeg frame stitching [BF-021]

> Worker pass for v0.3 "First Take" (packages/renderer). Scope honored: only
> `packages/renderer/**` (+ this report). No other packages, docs-site, CI,
> or turbo/pnpm config touched. No real FFmpeg in tests — injected `spawnFn`
> fakes only (same pattern as `ffmpeg-decode.ts`).

## What was done

1. **TDD RED** — `packages/renderer/test/stitch.test.ts` written first against
   the planned API: 49 tests failing on the missing `stitch` exports before
   any src change (verified: `stitchFrames is not a function`).
2. **TDD GREEN** — implemented `packages/renderer/src/stitch.ts`:
   - **Pure layer** (no process, fully unit-testable):
     - `CODEC_PROFILES` — `Readonly<Record<StitchCodec, StitchCodecProfile>>`
       mapping each of the seven BF-021 codecs to encoder, canonical
       extension, default pixel format and always-on extra flags:
       `h264`/`h265` → `libx264`/`libx265`, MP4, `yuv420p`,
       `-movflags +faststart`; `vp8`/`vp9` → `libvpx`/`libvpx-vp9`, WebM,
       `yuv420p`; `prores` → `prores_ks` profile 4444, MOV,
       `yuv444p10le` (alpha-ready for BF-023); `gif` → `gif` encoder
       defaults; `png-sequence` → `png` encoder defaults.
     - `resolveFramePattern(inputDirOrPattern)` — a path containing
       `%d`/`%0Nd` passes through unchanged; a directory gets
       `DEFAULT_FRAME_PATTERN` (`frame-%06d.png`) appended. JPEG inputs pass
       an explicit pattern.
     - `buildStitchArgs(inputDirOrPattern, options)` — deterministic argv:
       `-hide_banner -loglevel error -y -framerate <fps> [-start_number S]
       -i <pattern> -c:v <encoder> [-crf N | -b:v BR] <profile extraArgs>
       [-pix_fmt PF] [-vf scale=…] [-colorspace CS] [-frames:v count] <output>`.
       Options: `codec` (default h264), `fps` (default 30, fractional OK),
       `crf` (integer 0–63), `bitrate`, `scale`, `pixelFormat` (overrides the
       profile default), `colorSpace` (`-colorspace`), `frameRange`
       (half-open `[start, end)` → `-start_number` + `-frames:v count`,
       reuses `FrameRange` from `capture.ts`), `output`. Validation throws
       `RangeError` synchronously (empty paths, non-positive/non-finite fps,
       crf out of range, crf+bitrate together, empty strings, invalid range,
       unknown codec, png-sequence output without `%d`).
   - **Spawn wrapper**: `stitchFrames(inputDirOrPattern, options)` — builds
     args via the pure layer (so validation happens before any spawn), then
     spawns `ffmpeg` through an injectable `SpawnFn`
     (`options.spawnFn`, default `node:child_process.spawn`; `SpawnFn` and
     `FFmpegNotFoundError` reused from `ffmpeg-decode.ts` — one spelling per
     concept). Error style matches the existing modules: exit code ≠ 0 →
     `stitchFrames: FFmpeg exited with code N: <stderr>`; `ENOENT` →
     `FFmpegNotFoundError` (message points to `brandlyframes doctor`);
     other spawn errors → `Error` with `cause` chaining the original error.
     Resolves `void` on exit 0. Output is overwritten (`-y`).
3. **Exports** — `src/index.ts` re-exports `buildStitchArgs`, `stitchFrames`,
   `resolveFramePattern`, `CODEC_PROFILES`, `DEFAULT_FRAME_PATTERN`,
   `DEFAULT_STITCH_FPS` and types `StitchCodec`, `StitchCodecProfile`,
   `StitchOptions`, `StitchFramesOptions`. TSDoc on all public exports;
   no `any` (verified in emitted `dist/stitch.d.ts` — the only `any` hit is
   the English word in a comment).
4. **Tests** — 50 new (`test/stitch.test.ts`), covering: CODEC_PROFILES
   matrix (exact codec set, encoder/extension per codec, default pixel
   formats only where needed, extra flags); `resolveFramePattern`
   (directory, trailing slash, `%d`/`%04d` passthrough); exact default h264
   argv; exact codec tail for all seven codecs (`it.each` table); full
   argv with every option set at once (fps + crf + scale + pixelFormat +
   colorSpace + frameRange + explicit pattern); individual passthroughs
   (explicit fps, fractional 29.97 fps, crf placement after `-c:v`,
   bitrate, crf+bitrate rejection, scale, pixelFormat override,
   colorSpace, frameRange flag placement); validation (empty input/output,
   unknown codec, fps 0/-5/NaN/Infinity, crf -1/64/2.5, empty
   bitrate/scale/pixelFormat/colorSpace, invalid frameRange, png-sequence
   without `%d`); spawn wrapper (exact argv equality vs `buildStitchArgs`,
   resolve on exit 0, stderr accumulation on non-zero exit, SIGKILL code
   null, ENOENT → FFmpegNotFoundError with doctor hint, non-ENOENT with
   chained `cause`, synchronous validation without spawning).

## Gate results (round 1 — all green)

| Gate | Command | Result |
|---|---|---|
| tests | `pnpm --filter @brandlyframes/renderer test` | ✅ 76 passed (4 files: 26 existing + 50 new), 0 failed |
| build | `pnpm --filter @brandlyframes/renderer build` | ✅ `tsc` clean |
| type-check | `pnpm type-check` (root) | ✅ 29 tasks successful |
| lint | `pnpm lint` (`--max-warnings 0`) | ✅ 0 warnings |

One interim test-only fix during GREEN: fractional fps (`1.5`) was wrongly
listed as invalid — ffmpeg accepts NTSC-style fractional `-framerate`, so the
validation keeps finite positive numbers and the test now asserts
`-framerate 29.97` passthrough.

## Deviations / notes

- Naming: the spawn wrapper is `stitchFrames(inputDirOrPattern, options)`
  (the module-contract name); the task's "stitch()" shorthand refers to this
  same wrapper. No second alias export — one spelling per concept.
- `CODEC_PROFILES` carries an `extension` field (canonical container per
  codec) as profile metadata for the pending CLI naming (BF-025); the pure
  builder itself only consumes encoder/pixelFormat/extraArgs.
- Directory inputs resolve to `frame-%06d.png` (PNG default, matching the
  capture path's PNG screenshots); JPEG sequences must pass an explicit
  `%d` pattern (documented in TSDoc).
- crf/bitrate are validated and passed through for any codec (deterministic
  passthrough contract); unsupported combos surface FFmpeg's own error via
  the wrapper's stderr-including rejection. TSDoc scopes them to the lossy
  codecs.
- FrameVideo/audio/alpha (BF-022/023) intentionally out of scope: no audio
  input flags, no `-movflags` beyond the profile matrix, no alpha pixel
  format handling yet.
- Untracked pre-existing `dev-notes/workflows/p3-renderer.js` left untouched.
- `GOAL_00.md` BF-021 checkbox left unticked (outside this task's file
  boundary).
