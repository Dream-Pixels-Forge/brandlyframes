# P3 Stage: p3-audio-alpha (BF-022 audio mixing + BF-023 alpha output)

**Date**: 2026-10-18
**Worker run**: a2d544fb-f492-4483-9df4-75012e0a85a8 (workflow 6a8bf8c8)
**Outcome**: WORK COMPLETE — worker timed out during its final redundant gate-verification loop; orchestrator verified all gates green and committed the work.

## What landed

### BF-022 — audio mixing (`packages/renderer/src/audio.ts`, 305 lines)
- `buildMixArgs` / `mixAudio` (injectable `SpawnFn`, mirroring stitch.ts pattern)
- Per-track filtergraph: `atrim → asetpts → volume → afade-in/out → adelay`
- Volume curves as frame-anchored keyframes (`VolumeKeyframe`), fades, start
  offset, frame-mapped durations through composition fps (`DEFAULT_MIX_FPS = 30`)
- Tests: `packages/renderer/test/audio.test.ts` (458 lines)

### BF-023 — alpha output (`packages/renderer/src/stitch.ts`)
- `transparentBackground?: boolean` on `StitchOptions`
- `ALPHA_PIXEL_FORMATS`: vp9 → `yuva420p` (WebM alpha), prores → `yuva444p10le`
  (ProRes 4444); non-alpha codecs reject the flag with a `cause`-style RangeError
  pointing to `brandlyframes doctor`; mutually exclusive with `pixelFormat`
- Tests: +91 lines in `packages/renderer/test/stitch.test.ts`
- `index.ts` exports both modules

## Gate verification (orchestrator, post-timeout)

| Gate | Result |
|------|--------|
| `pnpm --filter @brandlyframes/renderer type-check` | ✅ clean |
| `pnpm --filter @brandlyframes/renderer test` | ✅ 5 files, 139 passed |
| `pnpm lint` (root) | ✅ 0 errors/warnings |

## Deviations

- Worker did not commit or write this report before the 1h timeout; orchestrator
  performed both after verifying gates (no code changes made by orchestrator).
