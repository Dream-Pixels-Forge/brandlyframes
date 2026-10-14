// BrandlyFrames pipeline — Phase 2 governance + Phase 3 engineer (P0+P1, v0.1 "Slate")
// Orchestrator: pipeline-orchestrator skill. Workers: TDD implementers. Gates: reviewers.
const ROOT = "/home/dimona/Dream-Pixels-Forge/Dev/Packages/brandlyframes";
function tail(r) {
  const s = String(r && r.output ? r.output : "");
  return s.length > 900 ? "…" + s.slice(-900) : s;
}

const T_DOCS = "You are the governance worker for the BrandlyFrames project (clean-room programmatic video SDK, React to MP4; MIT/Apache-2.0; never copy Remotion code). cwd: " + ROOT + ". FIRST read dev-notes/Goals/GOAL_00.md in full - it is the single source of truth. Then write exactly four markdown files:\n" +
"1. dev-notes/BRAINSTORM.md - condensed architecture vision: mission, package map (the Remotion vs BrandlyFrames table from section 3.1), pipeline flow (section 3.3), build-agent roles (orchestrator / TDD worker / gate reviewer), key decisions (esbuild+Vite bundler, pnpm+Turborepo, Vitest+Playwright, Changesets fixed lockstep publishing, clean-room rules), risks and mitigations from section 9.\n" +
"2. dev-notes/SPEC.md - engineering spec: repo structure (section 5), core API contracts (section 3.2 mapping table + section 4.2 FrameVideo API), module boundaries for packages/core (context+timing, components, animation, registry, runtime, utils), testing standards (section 8: golden-frame, determinism, frame-counter clips, cross-platform CI), DoD gates per phase (section 7) and version tracking rules (section 7c: one feature = one BF-### id = one issue = one PR).\n" +
"3. dev-notes/SECURITY.md - security baseline: secrets policy (never commit .env; .env in .gitignore), sandbox file access to project root, remote asset URL validation, no arbitrary code execution from props, telemetry opt-in only (none by default), CI secret handling (GitHub Secrets, never variables), pnpm audit policy, dependency pinning.\n" +
"4. dev-notes/DESIGN.md - Cinema Black design system from section 5b with exact values: token table (--bf-black #0A0A0A, --bf-surface-1 #111111, --bf-surface-2 #1A1A1A, --bf-border #2A2A2A, --bf-text-muted #8A8A8A, --bf-white #FAFAFA, --bf-orange #FF6A00, --bf-orange-hover #FF8533, --bf-orange-dim #FF6A0026), accent-at-most-5-percent rule, typography (Bebas Neue or Oswald display, Inter UI, JetBrains Mono timecode HH:MM:SS:FF tabular), cinema motifs (playhead, letterbox, slate, film grain marketing-only, REC dot, frame counter, anamorphic flare), component list, applied-to list, deliverables (CSS variables + TypeScript + JSON via Style Dictionary, Storybook).\n" +
"Boundaries: write ONLY these four files. No code, no installs, no git commands. Each file at least 80 lines and faithful to GOAL_00.md values.\n" +
"Validation: all four exist; DESIGN.md must contain the literal string #FF6A00.\n" +
"Report 20 lines max: file list, one-line purpose each. Detailed notes optionally in dev-notes/reports/governance-docs.md.";

const T_P0 = "Implement BF-001 (P0 Foundation) of BrandlyFrames. cwd: " + ROOT + " (currently contains only dev-notes/). Read dev-notes/Goals/GOAL_00.md sections 5, 7, 8, and dev-notes/SPEC.md and dev-notes/SECURITY.md if they exist. Node 24 + pnpm 11.5.1 only (never npm/yarn/bun for installs).\n" +
"Deliverables:\n" +
"1. git init (default branch main). First commit everything already present: 'chore: import goal and governance notes'.\n" +
"2. Root files: package.json (private true, workspaces packages/*, packageManager pnpm@11.5.1, engines node >=24, scripts: build, test, lint, type-check, format, dev), pnpm-workspace.yaml, .gitignore (node_modules, dist, coverage, .turbo, .env*, *.log, .DS_Store), LICENSE (MIT, Copyright 2026 Dream-Pixels-Forge), README.md (mission one-liner + monorepo layout + clean-room note), tsconfig.base.json (strict, ES2022 target, module ESNext, moduleResolution bundler, jsx react-jsx, skipLibCheck, forceConsistentCasingInFileNames, isolatedModules), flat ESLint config (@eslint/js + typescript-eslint) + Prettier, turbo.json (tasks build/test/lint/type-check with dependsOn and cached outputs), .changeset/config.json with fixed lockstep group for packages/*.\n" +
"3. .github/workflows/ci.yml - on pull_request to main: pnpm/action-setup v4 (version 11), actions/setup-node Node 24 with pnpm cache, pnpm install --frozen-lockfile, then pnpm type-check, pnpm lint, pnpm build, pnpm test; concurrency group with cancel-in-progress.\n" +
"4. packages/core: package.json (name 'brandlyframes', version 0.1.0, type module, exports pointing at src/index.ts for dev), peerDependencies react ^19 plus devDependencies react, react-dom, @types/react, zod (latest stable) as a real dependency, typescript, vitest, tsx; tsconfig.json extending the base; vitest.config.ts; src/index.ts placeholder exporting const BRANDLYFRAMES_VERSION = '0.1.0'; one smoke test packages/core/test/smoke.test.ts asserting that version string - it must pass.\n" +
"5. Run pnpm install at root, then pnpm type-check && pnpm lint && pnpm build && pnpm test - ALL must exit 0 (per-package build may be tsc --noEmit via turbo).\n" +
"6. Commit: 'feat: monorepo scaffold, tooling, CI [BF-001]'.\n" +
"Boundaries: do NOT implement any P1 features (no Composition, interpolate, spring, Sequence - placeholder index.ts only). Do not modify dev-notes/Goals. Do not add a git remote or push. Write a detailed run log to dev-notes/reports/p0-scaffold.md.\n" +
"Validation: rerun the four root scripts fresh; git log shows exactly 2 commits.\n" +
"Report 25 lines max: created tree, command results, commit hashes. If install fails irrecoverably after honest attempts, STOP and report the exact error.";

const T_P0_GATE = "Gate review: P0 Foundation (BF-001) of BrandlyFrames. cwd: " + ROOT + ". Verify independently - do not trust prior reports:\n" +
"(1) From repo root run: pnpm type-check && pnpm lint && pnpm build && pnpm test (run pnpm install first if node_modules is missing). All must exit 0.\n" +
"(2) Files exist and are sane: pnpm-workspace.yaml, turbo.json, tsconfig.base.json (strict true), .github/workflows/ci.yml (runs type-check + lint + build + test on pull_request), .changeset/config.json, LICENSE (MIT), README.md, .gitignore covers node_modules, .env*, dist, coverage.\n" +
"(3) packages/core exists: name 'brandlyframes', version 0.1.0, at least one passing test.\n" +
"(4) No P1 feature leak: no Composition/interpolate/spring/Sequence implementation yet (placeholder index.ts is expected).\n" +
"(5) git log: an initial dev-notes commit plus 'feat: monorepo scaffold, tooling, CI [BF-001]'; no remote configured.\n" +
"Final line must be exactly 'GATE: PASS' or 'GATE: FAIL: <numbered reasons>'. Report 30 lines max.";

const T_P0_FIX = "Your P0 scaffold failed the gate review. Fix exactly the findings below and nothing else. Re-run pnpm type-check && pnpm lint && pnpm build && pnpm test until all green. Commit as 'fix: p0 gate remediation [BF-001]'. Report 15 lines max: what you fixed plus the green command outputs. cwd: " + ROOT + ".";

const T_TIMING = "Implement P1 core timing of BrandlyFrames (BF-003, BF-004, plus the frame-context part of BF-006) with STRICT TDD: RED (write failing tests first), run vitest and watch them fail, GREEN (implement until passing), REFACTOR. cwd: " + ROOT + ". Read dev-notes/Goals/GOAL_00.md section 3.2 and behavior 1 of section 6, plus dev-notes/SPEC.md.\n" +
"Scope - packages/core only, these directories exclusively: src/context/** (frame context provider: currentFrame + videoConfig {fps, width, height, durationInFrames}), src/hooks/** (useCurrentFrame, useVideoConfig - must throw a helpful error outside a provider), src/components/sequence/** (Sequence with from/durationInFrames/layout, nested offset math), src/components/series/** (Series.Sequence with durations), src/components/loop/** (Loop with durationInFrames, child frame reset), src/components/freeze/** (Freeze frame override), src/components/absolute-fill/** (AbsoluteFill).\n" +
"CRITICAL: extract all nested Sequence/Series/Loop/Freeze frame math into pure functions under src/timing/** and test those exhaustively WITHOUT DOM (offset accumulation across nesting, out-of-range children, negative from, zero duration, looping reset math, freeze override chain). Determinism tests required: the same frame number always resolves to identical values.\n" +
"For hook tests prefer react-dom/server renderToString (react and react-dom are already devDependencies) - avoid adding jsdom or testing-library; only add a dependency if strictly unavoidable and say so in the report.\n" +
"Boundaries: do NOT touch src/animation/**, src/registry/**, src/runtime/**, src/utils/**, src/index.ts, package.json scripts, or other packages. Do NOT wire exports into src/index.ts (the integration pass owns it) - instead list every export you created in your report. Run npx vitest run packages/core until green, then pnpm type-check.\n" +
"Commit: 'feat(core): timeline timing engine [BF-003][BF-004]'.\n" +
"Report 25 lines max: modules created, export list (one per line), test count, timing coverage percent if measured.";

const T_ANIM = "Implement P1 animation utilities (BF-005) of BrandlyFrames with STRICT TDD: RED (failing tests first), GREEN, REFACTOR. cwd: " + ROOT + ". Read dev-notes/Goals/GOAL_00.md section 3.2 and behavior 3 of section 6.\n" +
"Scope exclusively: packages/core/src/animation/** (+ vitest coverage config if needed). Pure TypeScript - zero React or DOM imports.\n" +
"Required: interpolate(input, inputRange, outputRange, options) with easing and extrapolateLeft/extrapolateRight 'extend' | 'clamp' | 'identity'; Easing namespace (linear, quad, cubic, poly(n), sin, circle, exp, bounce, elastic, back(s), bezier(x1,y1,x2,y2), steps(n, 'start' | 'end')); spring({frame, fps, config: {damping, mass, stiffness, overshootClamping}, from, to, durationInFrames}) - physics-based and deterministic, with durationInFrames deriving a config that reaches the target at that duration; interpolateColors(input, inputRange, outputRange) supporting hex, rgb, rgba and common named colors, with alpha interpolation.\n" +
"Tests FIRST covering: clamping both sides, extend extrapolation, identity, reversed and unequal ranges, equal inputs, NaN/Infinity guards, single-point ranges, golden-value easing samples, spring determinism (same inputs produce identical outputs across calls) and spring with durationInFrames reaching endpoints, color midpoint exactness, alpha handling. Target at least 90 percent line coverage on src/animation and report the measured number (goal P1 gate).\n" +
"Boundaries: only src/animation/**. No src/index.ts wiring - list exports in the report. Do not touch other directories. Run npx vitest run packages/core until green, then pnpm type-check.\n" +
"Commit: 'feat(core): animation utils [BF-005]'.\n" +
"Report 25 lines max: exports list, test count, coverage percent for src/animation.";

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
"Boundaries: only src/registry/**, src/runtime/**, src/utils/** and their tests. Do not touch src/context, src/timing, src/components, src/animation, src/index.ts, other packages. Run npx vitest run packages/core until green, then pnpm type-check.\n" +
"Commit: 'feat(core): composition registry + runtime primitives [BF-002][BF-006][BF-007][BF-008][BF-400][BF-401]'.\n" +
"Report 25 lines max: exports list, test count, any deviations.";

const T_INTEGRATE = "Integration pass for P1 core of BrandlyFrames. cwd: " + ROOT + ". Prior pass logs are in dev-notes/reports/ - read them.\n" +
"Tasks:\n" +
"(1) Wire packages/core/src/index.ts exporting ALL public modules from timing, context, hooks, components, animation, registry, runtime, utils as one clean public API with TSDoc on exports (no 'any' in public API, per goal section 8).\n" +
"(2) Resolve cross-module type conflicts; ensure pnpm type-check && pnpm lint && pnpm build && pnpm test all green at root.\n" +
"(3) Add vitest coverage thresholds enforcing at least 90 percent lines for src/timing/** and src/animation/** (goal P1 gate: 90 percent-plus on timing/interpolate/spring). If below threshold, extend tests until met.\n" +
"(4) If no explicit cross-module determinism test exists (same frame resolved twice gives identical values), add one.\n" +
"(5) Add a changeset (.changeset/*.md) - minor bump for brandlyframes describing P1 core features BF-002 through BF-008, BF-400, BF-401.\n" +
"(6) Write packages/core/README.md: quick usage snippet (registerRoot + Composition + useCurrentFrame + interpolate + Sequence).\n" +
"(7) Commit: 'feat(core): public API wiring + coverage gates [BF-002][BF-003][BF-004][BF-005][BF-006][BF-007][BF-008][BF-400][BF-401]'.\n" +
"Report 20 lines max: green command results, coverage numbers, commit hash.";

const T_P1_GATE = "Gate review: P1 Core (v0.1 Slate core engine) of BrandlyFrames. cwd: " + ROOT + ". Verify independently:\n" +
"(1) Run pnpm type-check && pnpm lint && pnpm build && pnpm test from root - all exit 0.\n" +
"(2) Coverage: run vitest with coverage for packages/core; verify at least 90 percent lines for src/timing/** and src/animation/**.\n" +
"(3) Passing tests exist for: nested Sequence offset math, Series, Loop, Freeze, interpolate clamping and extrapolation, Easing samples, spring determinism, interpolateColors, composition registry validation + async calculateMetadata, holdFrame/releaseFrame, getInputProps, staticFile, random(seed) determinism, tc()/sec()/ms(), useMarker.\n" +
"(4) grep -r 'Math.random' packages/core/src returns nothing; no Date.now in frame-derived code paths.\n" +
"(5) src/index.ts exports the public API - spot-check registerRoot, Composition, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, random, staticFile.\n" +
"(6) git log shows conventional commits citing BF ids.\n" +
"Final line must be exactly 'GATE: PASS' or 'GATE: FAIL: <numbered reasons>'. Report 30 lines max.";

const T_P1_FIX = "Your P1 core work failed the gate review. Fix exactly the findings below and nothing else. Re-run pnpm type-check && pnpm lint && pnpm build && pnpm test until all green, and coverage thresholds until met. Commit as 'fix: p1 gate remediation [BF-002..BF-008]'. Report 15 lines max. cwd: " + ROOT + ".";

// ---- Stage 1: governance artifacts
const docs = await runs.run("governance-docs", { agent: "worker", label: "Write governance artifacts", task: T_DOCS });

// ---- Stage 2: P0 scaffold + reviewer gate (max 3 remediation rounds)
let p0 = await runs.run("p0-scaffold", { agent: "worker", label: "Scaffold monorepo BF-001", task: T_P0 });
let p0Pass = false;
let p0Last = "";
for (let i = 0; i < 3; i++) {
  const g = await runs.run("p0-gate-" + i, { agent: "reviewer", label: "Verify P0 gate", task: T_P0_GATE });
  p0Last = String(g && g.output ? g.output : "");
  if (p0Last.indexOf("GATE: PASS") !== -1) { p0Pass = true; break; }
  const fixTask = T_P0_FIX + "\nFINDINGS:\n" + p0Last.slice(-2500);
  p0 = p0.runId
    ? await runs.run("p0-fix-" + i, { resume: p0.runId, label: "Remediate P0 scaffold", task: fixTask })
    : await runs.run("p0-fix-" + i, { agent: "worker", label: "Remediate P0 scaffold", task: fixTask });
}

// ---- Stage 3: P1 core - sequential TDD writer passes (one writer at a time, same cwd)
const t1 = await runs.run("core-timing", { agent: "worker", label: "TDD timing engine", task: T_TIMING });
const t2 = await runs.run("core-animation", { agent: "worker", label: "TDD animation utils", task: T_ANIM });
const t3 = await runs.run("core-registry", { agent: "worker", label: "TDD registry runtime", task: T_REGISTRY });

// ---- Stage 4: integration + reviewer gate (max 3 remediation rounds)
let integ = await runs.run("p1-integrate", { agent: "worker", label: "Wire public API + coverage", task: T_INTEGRATE });
let p1Pass = false;
let p1Last = "";
for (let i = 0; i < 3; i++) {
  const g = await runs.run("p1-gate-" + i, { agent: "reviewer", label: "Verify P1 gate", task: T_P1_GATE });
  p1Last = String(g && g.output ? g.output : "");
  if (p1Last.indexOf("GATE: PASS") !== -1) { p1Pass = true; break; }
  const fixTask = T_P1_FIX + "\nFINDINGS:\n" + p1Last.slice(-2500);
  integ = integ.runId
    ? await runs.run("p1-fix-" + i, { resume: integ.runId, label: "Remediate P1 core", task: fixTask })
    : await runs.run("p1-fix-" + i, { agent: "worker", label: "Remediate P1 core", task: fixTask });
}

return {
  governanceDocs: { ok: docs.ok, output: tail(docs) },
  p0: { gatePassed: p0Pass, ok: p0.ok, output: tail(p0), lastGate: p0Last.slice(-500) },
  coreTdd: [
    { stage: "timing", ok: t1.ok, output: tail(t1) },
    { stage: "animation", ok: t2.ok, output: tail(t2) },
    { stage: "registry", ok: t3.ok, output: tail(t3) }
  ],
  p1: { gatePassed: p1Pass, ok: integ.ok, output: tail(integ), lastGate: p1Last.slice(-500) }
};
