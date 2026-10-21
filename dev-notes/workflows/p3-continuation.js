// P3 continuation — stages 4/5 + review of the original workflow (6a8bf8c8),
// which aborted when p3-audio-alpha timed out (its work was salvaged and
// committed by the orchestrator). Stages 1-3 are done:
//   p3-parallel-tabs [BF-020], p3-stitch [BF-021], p3-audio-alpha [BF-022/023]
// Sequential: one writer per cwd; chain stops on first non-complete verdict.
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
