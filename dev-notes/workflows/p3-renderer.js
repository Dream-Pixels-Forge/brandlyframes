// P3 "First Take" completion — sequential TDD stages, one writer per cwd.
// Each stage: worker implements RED→GREEN→REFACTOR, runs its own gates, commits with BF IDs,
// and returns a structured verdict. Chain stops on first non-complete verdict.
const statusSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['complete', 'blocked'] },
    summary: { type: 'string' },
    gatesGreen: { type: 'boolean' },
    commits: { type: 'array', items: { type: 'string' } },
    deviations: { type: 'string' }
  },
  required: ['status', 'summary', 'gatesGreen'],
  additionalProperties: false
};

const stage = (label, task) => ({ label, agent: 'worker', task, outputSchema: statusSchema, timeoutMs: 3600000 });

const results = [];

const s1 = await runs.run('p3-parallel-tabs', stage('Complete BF-020 parallel tab capture', `You are a TDD phase worker for BrandlyFrames (React->MP4 SDK monorepo, branch feature/bf-020-headless-capture). Read AGENTS.md, dev-notes/Goals/GOAL_00.md sections 6.6 and 7c (BF-020), dev-notes/SPEC.md, and packages/renderer/src/capture.ts + test/capture.test.ts first.
SCOPE: complete BF-020 — parallel tab capture. Add a bounded tab-pool: launch N browser tabs (concurrency option, default = min(cpuCount, 8)), dispatch frame-range chunks across tabs in parallel (Promise.allSettled over pool), recycle a tab when a capture fails (respawn once, then surface error with cause), keep splitFrameRange/captureFrame backward compatible.
INPUTS: existing capture.ts primitives; existing test fake-launcher pattern (launcherFactory returning fake tabs; NEVER require real Chrome in tests).
OUTPUTS: implemented + tested exports in packages/renderer (TabPool or captureParallel API — naming consistent with existing exports), tests in packages/renderer/test/, updated index.ts exports, TSDoc on all public exports, no 'any' in public API.
BOUNDARIES: touch ONLY packages/renderer/** (src + test). Do NOT touch other packages, docs-site, CI, turbo/pnpm config. Do NOT require real Chrome/ffmpeg in unit tests — inject fakes like existing tests do. TypeScript strict; lint 0 warnings.
VERIFICATION: from repo root run pnpm --filter @brandlyframes/renderer test, then pnpm --filter @brandlyframes/renderer build, then pnpm lint — fix until green (max 3 rounds), then commit referencing [BF-020]. Write your run log to dev-notes/reports/p3-parallel-tabs.md (what you did, test count, gate results, deviations).
Return structuredOutput: status complete only if all gates green and committed.`));

results.push({ stage: 'p3-parallel-tabs', ok: s1.ok, verdict: s1.structuredOutput });
if (!s1.ok || !s1.structuredOutput || s1.structuredOutput.status !== 'complete') {
  return { abortedAt: 'p3-parallel-tabs', results };
}

const s2 = await runs.run('p3-stitch', stage('Implement BF-021 FFmpeg stitching', `You are a TDD phase worker for BrandlyFrames (branch feature/bf-020-headless-capture). Read dev-notes/Goals/GOAL_00.md §6.6 (BF-021), packages/renderer/src/capture.ts, src/ffmpeg-decode.ts (spawnFn injection pattern), src/index.ts, and dev-notes/reports/p3-parallel-tabs.md for context.
SCOPE: BF-021 — FFmpeg stitching of captured frames into videos. New module packages/renderer/src/stitch.ts: stitchFrames(inputDirOrPattern, options) building deterministic ffmpeg arg arrays for codecs h264, h265, vp8, vp9, prores, gif, png-sequence; options: fps, crf, bitrate, scale, pixelFormat, colorSpace, frameRange, output; expose CODEC_PROFILES mapping and buildStitchArgs (pure, unit-testable) separate from the spawn wrapper stitch() (injectable spawnFn like ffmpeg-decode). Follow the existing error style (cause on thrown errors, message points to 'brandlyframes doctor').
INPUTS: capture output = numbered PNG/JPEG frame files.
OUTPUTS: stitch.ts + tests (arg building per codec, profile/flag matrix, scale/crf/bitrate passthrough, spawn wrapper with fake spawnFn incl. failure propagation), index.ts exports, TSDoc, no 'any'.
BOUNDARIES: ONLY packages/renderer/**. No real ffmpeg in tests. Gates stay green: pnpm lint, pnpm type-check, renderer build+test.
VERIFICATION: run gates yourself (max 3 rounds), commit with [BF-021], write dev-notes/reports/p3-stitch.md.
Return structuredOutput: status complete only if all gates green and committed.`));

results.push({ stage: 'p3-stitch', ok: s2.ok, verdict: s2.structuredOutput });
if (!s2.ok || !s2.structuredOutput || s2.structuredOutput.status !== 'complete') {
  return { abortedAt: 'p3-stitch', results };
}

const s3 = await runs.run('p3-audio-alpha', stage('Implement BF-022 audio mixing + BF-023 alpha', `You are a TDD phase worker for BrandlyFrames (branch feature/bf-020-headless-capture). Read dev-notes/Goals/GOAL_00.md §6.6 (BF-022, BF-023), packages/renderer/src/*.ts, dev-notes/reports/p3-stitch.md.
SCOPE: (a) BF-022 mixAudio(inputs, options): mix one or more audio tracks with per-track volume curves (constant or frame-ranged ramps/fades), fps-mapped durations, volume keyframes [{frame,volume}], fade in/out, offset; pure buildMixArgs + injectable spawnFn wrapper. (b) BF-023 alpha: extend stitch options with transparentBackground -> correct pix_fmt (yuva420p for vp9/webm, yuva444p10le for prores4444); validate invalid combos (h264+alpha) with clear errors (cause, 'brandlyframes doctor' hint).
OUTPUTS: audio.ts + alpha handling in stitch.ts + tests (volume curve arg matrix, fade math, alpha pix_fmt selection, invalid-combo errors), index.ts exports, TSDoc, no 'any'.
BOUNDARIES: ONLY packages/renderer/**. No real ffmpeg/Chrome in tests. All repo gates stay green (lint, type-check, build, test).
VERIFICATION: run gates yourself (max 3 rounds), commit with [BF-022][BF-023], write dev-notes/reports/p3-audio-alpha.md.
Return structuredOutput: status complete only if all gates green and committed.`));

results.push({ stage: 'p3-audio-alpha', ok: s3.ok, verdict: s3.structuredOutput });
if (!s3.ok || !s3.structuredOutput || s3.structuredOutput.status !== 'complete') {
  return { abortedAt: 'p3-audio-alpha', results };
}

const s4 = await runs.run('p3-progress-cli', stage('Implement BF-024 progress/resume + BF-025 CLI', `You are a TDD phase worker for BrandlyFrames (branch feature/bf-020-headless-capture). Read dev-notes/Goals/GOAL_00.md §6.6 (BF-024, BF-025) and §6.8 (CLI render/still/compositions), packages/renderer/src/*.ts, packages/cli/** (existing command wiring + test patterns), dev-notes/reports/p3-audio-alpha.md.
SCOPE: (a) BF-024 RenderJob orchestration — onProgress callbacks (frames done/total, per-chunk), AbortController cancellation (cooperative: stop scheduling, kill/await in-flight), resumable renders: partial-chunk manifest (JSON in outDir) recording completed ranges; rerun skips completed chunks. Unit-test with fakes (no Chrome). (b) BF-025 cli commands: brandlyframes render (composition id, output, codec, concurrency, props), still (composition, frame, output), compositions (list) — follow existing command structure in packages/cli exactly; wire to renderer APIs; offline tests mirroring existing CLI test patterns.
OUTPUTS: renderer/src/job.ts (or similar), cli commands + tests, exports, TSDoc, no 'any'.
BOUNDARIES: ONLY packages/renderer/** and packages/cli/**. No real Chrome/ffmpeg in tests. All repo gates stay green.
VERIFICATION: run gates yourself (max 3 rounds), commit with [BF-024][BF-025], write dev-notes/reports/p3-progress-cli.md.
Return structuredOutput: status complete only if all gates green and committed.`));

results.push({ stage: 'p3-progress-cli', ok: s4.ok, verdict: s4.structuredOutput });
if (!s4.ok || !s4.structuredOutput || s4.structuredOutput.status !== 'complete') {
  return { abortedAt: 'p3-progress-cli', results };
}

const s5 = await runs.run('p3-golden-harness', stage('Implement BF-026 golden-frame + determinism harness', `You are a TDD phase worker for BrandlyFrames (branch feature/bf-020-headless-capture). Read dev-notes/Goals/GOAL_00.md §8 Engineering standards (Golden-frame tests, Determinism test) and §6.6 (BF-026), packages/renderer/src/*.ts, dev-notes/reports/p3-progress-cli.md.
SCOPE: BF-026 golden-frame + determinism harness as packages/renderer/src/testing.ts: captureGoldenFrames(entry, {frames[], goldenDir, tolerance}), compareFrame (pixel-hash or buffer compare, per-channel configurable tolerance), assertDeterministicRender(entry, range) (render range twice, byte-compare). Pure comparison utilities unit-tested with fixtures (no Chrome); Chrome-dependent capture wrappers get thin integration seams with injected fakes. Vitest-friendly API.
OUTPUTS: testing.ts + tests + index exports + TSDoc + short usage doc block, no 'any'.
BOUNDARIES: ONLY packages/renderer/**. No real Chrome/ffmpeg in tests. All repo gates stay green.
VERIFICATION: run gates yourself (max 3 rounds), commit with [BF-026], write dev-notes/reports/p3-golden-harness.md.
Return structuredOutput: status complete only if all gates green and committed.`));

results.push({ stage: 'p3-golden-harness', ok: s5.ok, verdict: s5.structuredOutput });
if (!s5.ok || !s5.structuredOutput || s5.structuredOutput.status !== 'complete') {
  return { abortedAt: 'p3-golden-harness', results };
}

const review = await runs.run({
  key: 'p3-review',
  label: 'Review P3 renderer implementation',
  agent: 'reviewer',
  timeoutMs: 1800000,
  outputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['pass', 'fail'] },
      findings: { type: 'string' },
      requiredFixes: { type: 'string' }
    },
    required: ['status', 'findings'],
    additionalProperties: false
  },
  task: `Review the P3 renderer work committed on branch feature/bf-020-headless-capture (commits after 8c99300) in this repo. Read packages/renderer/src/*.ts and packages/renderer/test/*.ts plus dev-notes/reports/p3-*.md. Check against dev-notes/Goals/GOAL_00.md §6.6 and §8 standards: determinism (frame is the clock), no wall-clock time in capture/stitch paths, injectable fakes instead of real Chrome/ffmpeg in unit tests, error style consistency (cause + doctor hint), TSDoc on public exports, no 'any' in public API, test coverage of arg builders and failure propagation. You may make SMALL fixes directly if trivially wrong; report anything larger as requiredFixes. Do NOT run npm/pnpm commands, do NOT commit. Return structuredOutput status pass/fail with findings.`,
});

results.push({ stage: 'p3-review', ok: review.ok, verdict: review.structuredOutput });

return { complete: true, results };
