// BrandlyFrames pipeline — P1 Core (v0.1 "Slate"): 3 sequential TDD passes -> integration -> reviewer gate.
// Failure-safe: every runs.run is wrapped; child failure records + retries instead of killing the workflow.
const ROOT = "/home/dimona/Dream-Pixels-Forge/Dev/Packages/brandlyframes";
const WORKER_MS = 3900000;
const REVIEW_MS = 1800000;
function tail(r) {
  const s = String(r && r.output ? r.output : "");
  return s.length > 900 ? "…" + s.slice(-900) : s;
}
function tryRun(key, opts) {
  return runs.run(key, opts).then(
    (r) => ({ ok: true, receipt: r }),
    (e) => ({ ok: false, error: String(e && e.message ? e.message : e) })
  );
}

const CONT = "\n\nIMPORTANT: a previous pipeline attempt may have left partial work on disk. Start with git status + git log + inspecting existing files under packages/core/src, and CONTINUE from current state - never redo completed work, never commit twice.";

const T_TIMING = "Implement P1 core timing of BrandlyFrames (BF-003, BF-004, plus the frame-context part of BF-006) with STRICT TDD: RED (write failing tests first), run vitest and watch them fail, GREEN (implement until passing), REFACTOR. cwd: " + ROOT + ". Read dev-notes/Goals/GOAL_00.md section 3.2 and behavior 1 of section 6, plus dev-notes/SPEC.md.\n" +
"Scope - packages/core only, these directories exclusively: src/context/** (frame context provider: currentFrame + videoConfig {fps, width, height, durationInFrames}), src/hooks/** (useCurrentFrame, useVideoConfig - must throw a helpful error outside a provider), src/components/sequence/** (Sequence with from/durationInFrames/layout, nested offset math), src/components/series/** (Series.Sequence with durations), src/components/loop/** (Loop with durationInFrames, child frame reset), src/components/freeze/** (Freeze frame override), src/components/absolute-fill/** (AbsoluteFill).\n" +
"CRITICAL: extract all nested Sequence/Series/Loop/Freeze frame math into pure functions under src/timing/** and test those exhaustively WITHOUT DOM (offset accumulation across nesting, out-of-range children, negative from, zero duration, looping reset math, freeze override chain). Determinism tests required: the same frame number always resolves to identical values.\n" +
"For hook tests prefer react-dom/server renderToString (react and react-dom are already devDependencies) - avoid adding jsdom or testing-library; only add a dependency if strictly unavoidable and say so in the report.\n" +
"Boundaries: do NOT touch src/animation/**, src/registry/**, src/runtime/**, src/utils/**, src/index.ts, package.json scripts, or other packages. Do NOT wire exports into src/index.ts (the integration pass owns it) - instead list every export you created in your report. Run npx vitest run packages/core until green, then pnpm type-check. Commit: 'feat(core): timeline timing engine [BF-003][BF-004]'.\n" +
"Report 25 lines max: modules created, export list, test count, timing coverage percent if measured." + CONT;

const T_ANIM = "Implement P1 animation utilities (BF-005) of BrandlyFrames with STRICT TDD: RED (failing tests first), GREEN, REFACTOR. cwd: " + ROOT + ". Read dev-notes/Goals/GOAL_00.md section 3.2 and behavior 3 of section 6.\n" +
"Scope exclusively: packages/core/src/animation/** (+ vitest coverage config if needed). Pure TypeScript - zero React or DOM imports.\n" +
"Required: interpolate(input, inputRange, outputRange, options) with easing and extrapolateLeft/extrapolateRight 'extend' | 'clamp' | 'identity'; Easing namespace (linear, quad, cubic, poly(n), sin, circle, exp, bounce, elastic, back(s), bezier(x1,y1,x2,y2), steps(n, 'start' | 'end')); spring({frame, fps, config: {damping, mass, stiffness, overshootClamping}, from, to, durationInFrames}) - physics-based and deterministic, with durationInFrames deriving a config that reaches the target at that duration; interpolateColors(input, inputRange, outputRange) supporting hex, rgb, rgba and common named colors, with alpha interpolation.\n" +
"Tests FIRST covering: clamping both sides, extend extrapolation, identity, reversed and unequal ranges, equal inputs, NaN/Infinity guards, single-point ranges, golden-value easing samples, spring determinism (same inputs produce identical outputs across calls) and spring with durationInFrames reaching endpoints, color midpoint exactness, alpha handling. Target at least 90 percent line coverage on src/animation and report the measured number (goal P1 gate).\n" +
"Boundaries: only src/animation/**. No src/index.ts wiring - list exports in the report. Do not touch other directories. Run npx vitest run packages/core until green, then pnpm type-check. Commit: 'feat(core): animation utils [BF-005]'.\n" +
"Report 25 lines max: exports list, test count, coverage percent for src/animation." + CONT;

const T_REGISTRY = "Implement P1 composition registry + runtime primitives (BF-002, BF-006, BF-007, BF-008, BF-400, BF-401) of BrandlyFrames with STRICT TDD: RED, GREEN, REFACTOR. cwd: " + ROOT + ". Read dev-notes/Goals/GOAL_00.md section 3.2, behaviors 2 and 3 of section 6, and the v0.1 items of section 7d.\n" +
"Scope exclusively: packages/core/src/registry/**, src/runtime/**, src/utils/** (+ their tests).\n" +
"Required:\n" +
"(1) BF-002: registerRoot + composition registry - getCompositions(), <Composition id component durationInFrames fps width height defaultProps schema calculateMetadata>; validate unique ids, positive fps and dimensions; calculateMetadata may be async and can override durationInFrames/props (test with a resolved promise).\n" +
"(2) BF-006: holdFrame()/releaseFrame() with delayRender/continueRender semantics: active hold registry, optional timeout, deterministic behavior in node tests.\n" +
"(3) BF-006: getInputProps() reading an injectable props object; staticFile(path) normalizing to '/<path>' with duplicate-slash guard - both unit tested.\n" +
"(4) BF-007: basic <Img>, <Audio>, <Video> frame-driven primitives - thin deterministic render trees (no playback engine yet; P3/P5 extend them); test that rendered output at frame N is deterministic.\n" +
"(5) BF-400: random(seed) - deterministic hash-based generator where the same seed and frame always give the same value; no Math.random anywhere in src (grep must be clean).\n" +
"(6) BF-401: sec(seconds), ms(milliseconds), tc('HH:MM:SS:FF') converting to frames given fps (document rounding rules in TSDoc and test them); simple useMarker(name) resolving named markers from composition metadata to a frame number or null.\n" +
"(7) BF-008: Zod props schema validation with helpful errors + calculateMetadata support.\n" +
"Boundaries: only src/registry/**, src/runtime/**, src/utils/** and their tests. Do not touch src/context, src/timing, src/components, src/animation, src/index.ts, other packages. Run npx vitest run packages/core until green, then pnpm type-check. Commit: 'feat(core): composition registry + runtime primitives [BF-002][BF-006][BF-007][BF-008][BF-400][BF-401]'.\n" +
"Report 25 lines max: exports list, test count, any deviations." + CONT;

const T_INTEGRATE = "Integration pass for P1 core of BrandlyFrames. cwd: " + ROOT + ". Prior pass logs are in dev-notes/reports/ - read them.\n" +
"Tasks:\n" +
"(1) Wire packages/core/src/index.ts exporting ALL public modules from timing, context, hooks, components, animation, registry, runtime, utils as one clean public API with TSDoc on exports (no 'any' in public API, per goal section 8).\n" +
"(2) Resolve cross-module type conflicts; ensure pnpm type-check && pnpm lint && pnpm build && pnpm test all green at root.\n" +
"(3) Add vitest coverage thresholds enforcing at least 90 percent lines for src/timing/** and src/animation/** (goal P1 gate). If below threshold, extend tests until met.\n" +
"(4) If no explicit cross-module determinism test exists (same frame resolved twice gives identical values), add one.\n" +
"(5) Add a changeset (.changeset/*.md) - minor bump for brandlyframes describing P1 core features BF-002 through BF-008, BF-400, BF-401.\n" +
"(6) Write packages/core/README.md: quick usage snippet (registerRoot + Composition + useCurrentFrame + interpolate + Sequence).\n" +
"(7) Commit: 'feat(core): public API wiring + coverage gates [BF-002][BF-003][BF-004][BF-005][BF-006][BF-007][BF-008][BF-400][BF-401]'.\n" +
"Report 20 lines max: green command results, coverage numbers, commit hash." + CONT;

const T_P1_GATE = "Gate review: P1 Core (v0.1 Slate core engine) of BrandlyFrames. cwd: " + ROOT + ". Verify independently:\n" +
"(1) Run pnpm type-check && pnpm lint && pnpm build && pnpm test from root - all exit 0.\n" +
"(2) Coverage: run vitest with coverage for packages/core; verify at least 90 percent lines for src/timing/** and src/animation/**.\n" +
"(3) Passing tests exist for: nested Sequence offset math, Series, Loop, Freeze, interpolate clamping and extrapolation, Easing samples, spring determinism, interpolateColors, composition registry validation + async calculateMetadata, holdFrame/releaseFrame, getInputProps, staticFile, random(seed) determinism, tc()/sec()/ms(), useMarker.\n" +
"(4) grep -r 'Math.random' packages/core/src returns nothing; no Date.now in frame-derived code paths.\n" +
"(5) src/index.ts exports the public API - spot-check registerRoot, Composition, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, random, staticFile.\n" +
"(6) git log shows conventional commits citing BF ids.\n" +
"Final line must be exactly 'GATE: PASS' or 'GATE: FAIL: <numbered reasons>'. Report 30 lines max.";

const T_FIX = "Your P1 core work failed a gate review. Fix exactly the findings below and nothing else. Re-run pnpm type-check && pnpm lint && pnpm build && pnpm test until all green, and coverage thresholds until met. Commit as 'fix: p1 gate remediation [BF-002..BF-008]'. Report 15 lines max. cwd: " + ROOT + ".";

// ---- Stage 0: independent P0 confirmation (cheap reviewer pass)
const p0 = await tryRun("p0-confirm", { agent: "reviewer", label: "Confirm P0 gate", task: "Independent confirmation of the P0 Foundation gate (BF-001) of BrandlyFrames. cwd: " + ROOT + ". Run pnpm type-check && pnpm lint && pnpm build && pnpm test from root (all must exit 0); verify git log has the scaffold commit citing [BF-001]; verify packages/core exists with name 'brandlyframes' v0.1.0 and a passing smoke test; verify no P1 implementation leaked (src/index.ts must be a placeholder). Final line exactly 'GATE: PASS' or 'GATE: FAIL: <reasons>'. Report 15 lines max.", timeoutMs: REVIEW_MS });

// ---- Stage 1: P1 TDD pass 1 - timing engine
let timing = await tryRun("core-timing", { agent: "worker", label: "TDD timing engine", task: T_TIMING, timeoutMs: WORKER_MS });
if (!timing.ok) {
  timing = await tryRun("core-timing-retry", { agent: "worker", label: "Retry TDD timing engine", task: T_TIMING + "\n\nPrior attempt failed with: " + timing.error, timeoutMs: WORKER_MS });
}

// ---- Stage 2: P1 TDD pass 2 - animation utils
let anim = await tryRun("core-animation", { agent: "worker", label: "TDD animation utils", task: T_ANIM, timeoutMs: WORKER_MS });
if (!anim.ok) {
  anim = await tryRun("core-animation-retry", { agent: "worker", label: "Retry TDD animation utils", task: T_ANIM + "\n\nPrior attempt failed with: " + anim.error, timeoutMs: WORKER_MS });
}

// ---- Stage 3: P1 TDD pass 3 - registry + runtime
let reg = await tryRun("core-registry", { agent: "worker", label: "TDD registry runtime", task: T_REGISTRY, timeoutMs: WORKER_MS });
if (!reg.ok) {
  reg = await tryRun("core-registry-retry", { agent: "worker", label: "Retry TDD registry runtime", task: T_REGISTRY + "\n\nPrior attempt failed with: " + reg.error, timeoutMs: WORKER_MS });
}

// ---- Stage 4: integration
let integ = await tryRun("p1-integrate", { agent: "worker", label: "Wire public API + coverage", task: T_INTEGRATE, timeoutMs: WORKER_MS });
if (!integ.ok) {
  integ = await tryRun("p1-integrate-retry", { agent: "worker", label: "Retry integration pass", task: T_INTEGRATE + "\n\nPrior attempt failed with: " + integ.error, timeoutMs: WORKER_MS });
}

// ---- Stage 5: reviewer gate with up to 3 remediation rounds
let p1Pass = false;
let p1Last = "";
for (let i = 0; i < 3; i++) {
  const g = await tryRun("p1-gate-" + i, { agent: "reviewer", label: "Verify P1 gate", task: T_P1_GATE, timeoutMs: REVIEW_MS });
  p1Last = g.ok ? String(g.receipt && g.receipt.output ? g.receipt.output : "") : "gate run failed: " + g.error;
  if (p1Last.indexOf("GATE: PASS") !== -1) { p1Pass = true; break; }
  const fixTask = T_FIX + "\nFINDINGS:\n" + p1Last.slice(-2500);
  integ = integ.ok && integ.receipt.runId
    ? await tryRun("p1-fix-" + i, { resume: integ.receipt.runId, label: "Remediate P1 core", task: fixTask, timeoutMs: WORKER_MS })
    : await tryRun("p1-fix-" + i, { agent: "worker", label: "Remediate P1 core", task: fixTask, timeoutMs: WORKER_MS });
}

return {
  p0Confirmed: p0.ok ? tail(p0.receipt) : "reviewer failed: " + p0.error,
  timing: timing.ok ? tail(timing.receipt) : "FAILED: " + timing.error,
  animation: anim.ok ? tail(anim.receipt) : "FAILED: " + anim.error,
  registry: reg.ok ? tail(reg.receipt) : "FAILED: " + reg.error,
  integration: integ.ok ? tail(integ.receipt) : "FAILED: " + integ.error,
  p1GatePassed: p1Pass,
  lastGateVerdict: p1Last.slice(-600)
};
