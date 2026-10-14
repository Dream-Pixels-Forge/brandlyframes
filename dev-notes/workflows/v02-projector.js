// BrandlyFrames pipeline — P2 Studio (v0.2 "Projector"): design -> fonts -> bundler -> cli -> studio -> integration -> gate.
// Failure-safe: every runs.run wrapped; sequential writers (one writer per cwd at a time).
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

const COMMON = "Project conventions: cwd " + ROOT + " (pnpm 11.5.1 monorepo, Node 24, TS strict ^5.9.3, vitest, turbo). NEVER use npm/yarn/bun for installs. Read dev-notes/Goals/GOAL_00.md (sections 3.2, 5b, 6 behavior 4, 7c v0.2 items, 7d v0.2 items), dev-notes/DESIGN.md and dev-notes/SPEC.md before coding. STRICT TDD: RED (failing tests first, run vitest and watch them fail) then GREEN then REFACTOR. Commit with conventional message citing BF ids. Write a run log to dev-notes/reports/<stage>.md. No Math.random / Date.now in shipped src. Keep existing packages untouched except where your scope says otherwise. Report 25 lines max.";

const T_DESIGN = COMMON + "\n" +
"TASK: Create packages/design ('@brandlyframes/design', version 0.1.0, type module, peerDependencies react ^19, devDeps react/@types/react/typescript/vitest; add to pnpm-workspace automatically via packages/*). BF-013 - Cinema Black tokens + core components.\n" +
"Deliverables: (1) Tokens in THREE synced forms from dev-notes/DESIGN.md exact values: src/tokens.css (CSS variables --bf-black #0A0A0A, --bf-surface-1 #111111, --bf-surface-2 #1A1A1A, --bf-border #2A2A2A, --bf-text-muted #8A8A8A, --bf-white #FAFAFA, --bf-orange #FF6A00, --bf-orange-hover #FF8533, --bf-orange-dim #FF6A0026; dark default + [data-theme='paper'] light inverse), src/tokens.ts (typed const map + type), tokens.json (flat map). (2) Pure util src/contrast.ts - WCAG relative-luminance + contrast-ratio function (pure, exported, unit-tested). (3) Components (React, styled via tokens, deterministic SSR): Button (primary orange / secondary outline / ghost variants), Panel, Tabs, Tooltip, Toast, Progress (clapper + bar variants), FrameCounter (mono, tabular 'FRAME 0042 / 0300' format), TimecodeInput (HH:MM:SS:FF), LogoLockup (BRANDLYFRAMES wordmark + orange frame-bracket mark). Keep each component small and typed; TSDoc on exports.\n" +
"Tests (vitest): token exact values in all three forms are consistent; contrast() math golden values (black/white = 21:1, orange on black ~ 21*relative), AA assertions for the shipped text pairs (white on black, muted on surface-1, white on surface-2 - must pass 4.5:1; document orange-on-black for accents only); each component SSR-renders deterministically via react-dom/server (renderToString twice - identical); Button variant switching.\n" +
"Boundary: only packages/design/** (+ pnpm install at root if needed). Do not touch packages/core or root config beyond adding the package. Commit: 'feat(design): Cinema Black tokens + components [BF-013]'.";

const T_FONTS = COMMON + "\n" +
"TASK: packages/core addition - BF-410 font loading that just works.\n" +
"Deliverables: src/fonts/** - loadFont(family, url | googleFontSpec) returning a promise that resolves when the FontFace is loaded; useFont(family, url) React hook that (a) triggers loadFont once, (b) calls holdFrame()/releaseFrame() from src/runtime so the current frame is never captured before the font is ready, (c) returns loaded state. Support local URLs and Google Fonts (construct the fonts.googleapis.com css2 URL + fetch the font file URL - mock fetch in tests). Never throw on duplicate loads (idempotent per family+url). Failure mode: timeout (configurable, default 30s virtual) -> clear error naming the family and URL.\n" +
"Tests: fake FontFace + document.fonts mocks in node; idempotency; holdFrame called and released; timeout error path with fake timers; SSR safety (hook must not break renderToString). NO changes to src/index.ts (integration pass owns it) - list new exports in the report. Run npx vitest run packages/core until green + pnpm type-check.\n" +
"Boundary: only packages/core/src/fonts/** + its tests (test/fixtures ok). Commit: 'feat(core): font loading with automatic frame holds [BF-410]'.";

const T_BUNDLER = COMMON + "\n" +
"TASK: Create packages/bundler ('@brandlyframes/bundler', v0.1.0). BF-010 - esbuild bundler with asset manifest.\n" +
"Deliverables: src/index.ts exposing bundle(options) and watch mode. bundle({entryPoint, outDir, publicPath?, minify?, sourcemap?, onRebuild?}) -> uses esbuild's JavaScript API (dependency: esbuild) to bundle the entry (user file calling registerRoot) into outDir, emitting: bundle js (esm or iife - pick iife for studio injection, TSDoc why), and asset-manifest.json { entry, outDir, publicPath, jsFile (hashed name), assets: [{source, output}], buildTime (deterministic in tests - inject clock), esbuildVersion }. watch(options) -> esbuild context with rebuild events surfacing through onRebuild callback (used later by studio hot reload).\n" +
"Tests: fixture entry under test/fixtures (imports a component file); bundle produces output files + manifest with correct shape; hashing is deterministic (same input -> same name); publicPath prefixing; rebuild callback fires on change (esbuild rebuild API or simulated); error path (missing entry -> clear error). esbuild postinstall is already approved via pnpm-workspace onlyBuiltDependencies - keep it.\n" +
"Boundary: only packages/bundler/** (+ root install). Commit: 'feat(bundler): esbuild bundler + asset manifest [BF-010]'.";

const T_CLI = COMMON + "\n" +
"TASK: Create packages/cli ('@brandlyframes/cli', v0.1.0, bin: 'brandlyframes'). BF-014 + BF-015.\n" +
"Deliverables: (1) BF-014 config loader src/config.ts: loadConfig(cwd) - finds brandlyframes.config.ts (or .js/.json) at project root, loads it via tsx/esbuild-register (or esbuild transpile + dynamic import), returns typed BrandlyFramesConfig { entry?: string (default 'src/index.ts'), outDir?: string (default 'dist'), publicPath?: string, studio?: {port?: number} } with sane defaults + validation errors. (2) BF-015 commands via a tiny hand-rolled arg parser (no heavy deps): 'brandlyframes bundle' -> loadConfig then call @brandlyframes/bundler bundle(); 'brandlyframes studio' -> loadConfig, build the studio dev page (serve via node http server a minimal HTML shell that loads the bundled entry + the studio package script; opening the browser is optional behind --open), port from config or --port flag; '--help' output; unknown command -> helpful error. Use workspace deps via the 'brandlyframes' + '@brandlyframes/bundler' package names (add them to cli package.json dependencies - pnpm workspace links them; NOTE the core package is literally named 'brandlyframes').\n" +
"Tests: config loader (fixture configs: ts, json, missing -> defaults, invalid -> error), arg parsing (bundle/studio/help/unknown), bundle command end-to-end against a fixture entry using the real bundler (assert manifest + files in a temp dir), studio server smoke (start on port 0, fetch / -> 200 html).\n" +
"Boundary: only packages/cli/** (+ root install). Commit: 'feat(cli): config loader + bundle/studio commands [BF-014][BF-015]'.";

const T_STUDIO = COMMON + "\n" +
"TASK: Create packages/studio ('@brandlyframes/studio', v0.1.0). BF-011, BF-012, BF-411, BF-412. Uses @brandlyframes/design + 'brandlyframes' (core) as workspace deps.\n" +
"Deliverables: (1) BF-011 StudioShell: left sidebar listing compositions (from the core registry via getCompositions() - the studio page imports the user entry which calls registerRoot, then reads the registry), center canvas rendering the CURRENT frame of the selected composition (render the composition component inside FrameContextProvider with frame from the scrubber - deterministic per frame, React 19), bottom timeline scrubber (orange playhead, frame counter readout using design tokens, range input + keyboard arrows), hot reload hook (re-fetch/re-render when the bundler watch signals - expose a HmrBridge that accepts a callback; unit test the bridge with a simulated rebuild event). (2) BF-012 PropsEditor: given a composition's zod schema, introspect top-level fields (z.string -> text input, z.number -> number input, z.boolean -> checkbox, z.enum -> select, z.object -> nested group) and render controlled inputs from design components; onChange produces validated inputProps via schema.safeParse and calls back with parsed data or field errors. (3) BF-411 ErrorOverlay: error boundary + window error capture showing the failing component name, current frame number, props snapshot, and the error message, styled per Cinema Black (dark surface, orange accent line, white text). (4) BF-412 FrameInspector: shows the selected composition's resolved props at the current frame (from the props editor state + calculateMetadata result) and the raw frame number. (5) examples/hello-world: package-less example folder with registerRoot entry, two compositions (one with a zod schema + calculateMetadata), brandlyframes.config.ts, so the CLI can bundle it.\n" +
"Tests (node/SSR, no browser): StudioShell SSR-renders with a fixture registry (compositions listed, frame 0 canvas content present); scrubber math pure function unit tests (frame clamp, keyboard step); PropsEditor field generation for each zod type + validation error mapping; ErrorOverlay captures thrown render error and displays component/frame/props; FrameInspector displays resolved props; HmrBridge callback fires. Determinism: renderToString twice identical.\n" +
"Boundary: only packages/studio/** + examples/hello-world/** (+ root install). Do not modify packages/core or packages/bundler. Commit: 'feat(studio): shell, scrubber, props editor, error overlay, frame inspector [BF-011][BF-012][BF-411][BF-412]'.";

const T_INTEGRATE = COMMON + "\n" +
"TASK: v0.2 integration pass (orchestrator hold-gate prep). cwd " + ROOT + ".\n" +
"1. Wire ALL new public exports: packages/core src/index.ts must also export the fonts module (BF-410 loadFont/useFont); packages/design, bundler, cli, studio each export their public API from their src/index.ts with TSDoc (no 'any' in public APIs).\n" +
"2. Root: README.md - add package table (core/design/bundler/cli/studio + one-liners); turbo.json tasks must cover the new packages (build/test/lint/type-check run everywhere).\n" +
"3. Changeset: minor bumps for brandlyframes (fonts) + new packages @brandlyframes/design, @brandlyframes/bundler, @brandlyframes/cli, @brandlyframes/studio describing BF-010..015, BF-410..412.\n" +
"4. End-to-end check script (not a test): run 'brandlyframes bundle' against examples/hello-world via tsx src (document the command in examples/hello-world/README.md) - verify dist output + manifest exist. Put the verification transcript in dev-notes/reports/v02-integration.md.\n" +
"5. Gates green at root: pnpm type-check && pnpm lint && pnpm build && pnpm test (all packages). Fix any cross-package type/lint conflicts.\n" +
"6. Commit: 'feat: v0.2 Projector integration - bundler, studio, design, cli [BF-010][BF-011][BF-012][BF-013][BF-014][BF-015][BF-410][BF-411][BF-412]'.\n" +
"Report 20 lines max: green gates, e2e result, coverage of new packages, commit hash.";

const T_GATE = "Gate review: P2 Studio (v0.2 Projector) of BrandlyFrames. cwd " + ROOT + ". You have NO shell tool - verify statically and request execution evidence from the supervisor for command items:\n" +
"(1) [ASK SUPERVISOR TO RUN] pnpm type-check && pnpm lint && pnpm build && pnpm test at root - all exit 0; report vitest totals.\n" +
"(2) Statically: packages/design exists with tokens in three synced forms (exact values incl #FF6A00) + contrast util + components, all with tests incl WCAG AA assertions; packages/bundler has esbuild bundle + asset-manifest + watch tests with fixtures; packages/cli has brandlyframes bin, config loader (ts/json/defaults/invalid paths tested) + bundle/studio commands with e2e fixture tests; packages/studio has StudioShell/scrubber/PropsEditor/ErrorOverlay/FrameInspector/HmrBridge with SSR + unit tests; examples/hello-world has registerRoot entry + 2 compositions + zod schema + brandlyframes.config.ts.\n" +
"(3) Statically: no Math.random/Date.now in any shipped src (grep all packages/*/src); design tokens not duplicated (studio/cli import from @brandlyframes/design or their own token modules - no hardcoded hex scattered in studio components beyond token imports).\n" +
"(4) git log: conventional commits citing BF-010..BF-015 and BF-410..BF-412.\n" +
"(5) Coverage: new packages should have vitest coverage configured or reported - flag if any package has zero tests.\n" +
"Final line exactly 'GATE: PASS' or 'GATE: FAIL: <numbered reasons>'. Report 35 lines max.";

const T_FIX = "Your v0.2 Projector work failed the gate review. Fix exactly the findings below and nothing else. Re-run pnpm type-check && pnpm lint && pnpm build && pnpm test until green. Commit as 'fix: v0.2 gate remediation [BF-010..BF-015]'. Report 15 lines max. cwd " + ROOT + ".";

// ---- Stage A: design package
let design = await tryRun("v02-design", { agent: "worker", label: "TDD design package", task: T_DESIGN, timeoutMs: WORKER_MS });
if (!design.ok) design = await tryRun("v02-design-retry", { agent: "worker", label: "Retry design package", task: T_DESIGN + "\n\nPrior attempt failed with: " + design.error, timeoutMs: WORKER_MS });

// ---- Stage B: fonts in core
let fonts = await tryRun("v02-fonts", { agent: "worker", label: "TDD font loading", task: T_FONTS, timeoutMs: WORKER_MS });
if (!fonts.ok) fonts = await tryRun("v02-fonts-retry", { agent: "worker", label: "Retry font loading", task: T_FONTS + "\n\nPrior attempt failed with: " + fonts.error, timeoutMs: WORKER_MS });

// ---- Stage C: bundler
let bundler = await tryRun("v02-bundler", { agent: "worker", label: "TDD esbuild bundler", task: T_BUNDLER, timeoutMs: WORKER_MS });
if (!bundler.ok) bundler = await tryRun("v02-bundler-retry", { agent: "worker", label: "Retry esbuild bundler", task: T_BUNDLER + "\n\nPrior attempt failed with: " + bundler.error, timeoutMs: WORKER_MS });

// ---- Stage D: cli + config
let cli = await tryRun("v02-cli", { agent: "worker", label: "TDD cli + config loader", task: T_CLI, timeoutMs: WORKER_MS });
if (!cli.ok) cli = await tryRun("v02-cli-retry", { agent: "worker", label: "Retry cli + config loader", task: T_CLI + "\n\nPrior attempt failed with: " + cli.error, timeoutMs: WORKER_MS });

// ---- Stage E: studio + example
let studio = await tryRun("v02-studio", { agent: "worker", label: "TDD studio shell", task: T_STUDIO, timeoutMs: WORKER_MS });
if (!studio.ok) studio = await tryRun("v02-studio-retry", { agent: "worker", label: "Retry studio shell", task: T_STUDIO + "\n\nPrior attempt failed with: " + studio.error, timeoutMs: WORKER_MS });

// ---- Stage F: integration
let integ = await tryRun("v02-integrate", { agent: "worker", label: "Integrate v0.2 packages", task: T_INTEGRATE, timeoutMs: WORKER_MS });
if (!integ.ok) integ = await tryRun("v02-integrate-retry", { agent: "worker", label: "Retry v0.2 integration", task: T_INTEGRATE + "\n\nPrior attempt failed with: " + integ.error, timeoutMs: WORKER_MS });

// ---- Stage G: reviewer gate, up to 3 remediation rounds
let gatePass = false;
let gateLast = "";
for (let i = 0; i < 3; i++) {
  const g = await tryRun("v02-gate-" + i, { agent: "reviewer", label: "Verify v0.2 gate", task: T_GATE, timeoutMs: REVIEW_MS });
  gateLast = g.ok ? String(g.receipt && g.receipt.output ? g.receipt.output : "") : "gate run failed: " + g.error;
  if (gateLast.indexOf("GATE: PASS") !== -1) { gatePass = true; break; }
  const fixTask = T_FIX + "\nFINDINGS:\n" + gateLast.slice(-2500);
  integ = integ.ok && integ.receipt.runId
    ? await tryRun("v02-fix-" + i, { resume: integ.receipt.runId, label: "Remediate v0.2", task: fixTask, timeoutMs: WORKER_MS })
    : await tryRun("v02-fix-" + i, { agent: "worker", label: "Remediate v0.2", task: fixTask, timeoutMs: WORKER_MS });
}

return {
  design: design.ok ? tail(design.receipt) : "FAILED: " + design.error,
  fonts: fonts.ok ? tail(fonts.receipt) : "FAILED: " + fonts.error,
  bundler: bundler.ok ? tail(bundler.receipt) : "FAILED: " + bundler.error,
  cli: cli.ok ? tail(cli.receipt) : "FAILED: " + cli.error,
  studio: studio.ok ? tail(studio.receipt) : "FAILED: " + studio.error,
  integration: integ.ok ? tail(integ.receipt) : "FAILED: " + integ.error,
  gatePassed: gatePass,
  lastGateVerdict: gateLast.slice(-600)
};
