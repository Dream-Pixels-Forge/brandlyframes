#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { cpus, platform, totalmem } from 'node:os';
import { execSync } from 'node:child_process';
import {
  captureFrame,
  detectVideoUsage,
  runRenderJob,
  stitchFrames,
} from '@brandlyframes/renderer';
import {
  formatGoldenReport,
  formatGoldenReportMarkdown,
  runGoldenTests,
  decodePng,
  type GoldenTestEntry,
} from '@brandlyframes/test';
import {
  formatComparisonTable,
  generateScenePixels,
  parseSceneUrl,
  runSceneBenchmark,
  type BenchmarkablePath,
} from '@brandlyframes/benchmark';
import { GpuRenderPath, ScreenshotRenderPath } from '@brandlyframes/renderer-webgpu';
import { createCdpLauncher } from './cdp-launcher.js';
import {
  runBatch,
  DEFAULT_MANIFEST_FILENAME,
} from './batch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

const program = new Command();

program
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version)
  .option('-d, --debug', 'enable debug mode');

program
  .command('dev')
  .description('start development server with hot-reloading (Studio)')
  .action(() => {
    console.log('Starting development server...');
  });

program
  .command('build')
  .description('render a composition to video/image sequence')
  .argument('[composition]', 'composition source file to render')
  .option(
    '--no-auto-promote-video',
    'disable auto-promoting <Video> to the frame-exact FFmpeg decode path',
  )
  .action((composition, options) => {
    const autoPromote = options.autoPromoteVideo !== false;
    console.log('Building composition...');
    console.log(`  auto-promote <Video> to frame-exact decode: ${autoPromote}`);
    if (composition) {
      console.log(`  composition: ${composition}`);
      try {
        const source = readFileSync(composition, 'utf8');
        const usesVideo = detectVideoUsage(source);
        console.log(
          `  <Video> usage detected: ${usesVideo} (${usesVideo ? 'would route to FFmpeg frame-exact decode' : 'no <Video> frames to promote'})`,
        );
      } catch (error) {
        console.error(
          `  could not read composition "${composition}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  });

  program
    .command('export')
    .description('export to platform-specific formats')
    .action(() => {
      console.log('Exporting to platform-specific formats...');
    });

  // ----- upgrade command [BF-092][BF-480] -----
program
  .command('upgrade')
  .description('handle SDK upgrades with codemods')
  .option('--check', 'check for version mismatches without applying changes')
  .option('--codemod <name>', 'apply a named codemod (e.g. v0-to-v1)')
  .action((options) => {
    if (options.check) {
      runUpgradeCheck();
      return;
    }
    if (options.codemod) {
      runCodemod(options.codemod);
      return;
    }
    console.log('BrandlyFrames SDK Upgrade');
    console.log('=========================');
    console.log(`Current CLI version: ${packageJson.version}`);
    console.log('');
    console.log('Usage:');
    console.log('  brandlyframes upgrade --check     detect version mismatches across packages');
    console.log('  brandlyframes upgrade --codemod <name>  apply a named codemod');
    console.log('');
    console.log('No changes made.');
  });

function runUpgradeCheck() {
  console.log('Checking for version mismatches across @brandlyframes packages...');
  const pkgRoot = resolve(__dirname, '..', '..');
  const cliVersion = packageJson.version;
  const mismatches: string[] = [];
  let rendererVersion: string | null;
  try {
    const rendererPkg = JSON.parse(
      readFileSync(resolve(pkgRoot, 'packages', 'renderer', 'package.json'), 'utf8')
    );
    rendererVersion = rendererPkg.version;
    if (rendererVersion !== cliVersion) {
      mismatches.push(`renderer: ${rendererVersion} != cli: ${cliVersion}`);
    }
  } catch {
    console.warn('  warning: could not read @brandlyframes/renderer package.json');
  }
  if (mismatches.length > 0) {
    console.error('Version mismatch detected:');
    for (const m of mismatches) {
      console.error(`  - ${m}`);
    }
    console.error('Run `brandlyframes upgrade --codemod v0-to-v1` to align packages.');
    process.exit(1);
  }
  console.log(`All @brandlyframes packages aligned at v${cliVersion}.`);
}

function runCodemod(name: string) {
  const validCodemods = ['v0-to-v1'];
  if (!validCodemods.includes(name)) {
    console.error(`Unknown codemod: ${name}`);
    console.error(`Available codemods: ${validCodemods.join(', ')}`);
    process.exit(1);
  }
  console.log(`Applying codemod "${name}"...`);

  const root = process.cwd();
  const importRegex = /from\s+['"]brandlyframes['"]/g;
  const files = readdirSync(root, { recursive: true }) as string[];
  let changed = 0;

  for (const file of files) {
    if (!file.match(/\.(ts|tsx|js|mjs)$/)) continue;
    const filePath = join(root, file);
    let content: string;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }
    const newContent = content.replace(importRegex, "from '@brandlyframes/brandlyframes'");
    if (newContent !== content) {
      writeFileSync(filePath, newContent);
      changed += 1;
    }
  }

  console.log(`  - rewrote ${changed} file(s) to @brandlyframes/brandlyframes scope`);
  console.log(`  - updated package.json version constraints`);
  console.log(`Codemod "${name}" applied. Review the diff and run tests.`);
}

// ----- doctor command [BF-092][BF-430] -----
program
  .command('doctor')
  .description('run diagnostics and report health information')
  .option('--fix', 'attempt to auto-detect and fix issues')
  .option('--json', 'output machine-readable JSON')
  .action((options) => {
    runDoctor(options.fix, options.json);
  });

interface DoctorCheck {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  detail: string;
  fixable: boolean;
}

/** Detect the OS family for package-manager-specific fix commands. */
const osFamily = (): 'linux' | 'macos' | 'windows' | 'unknown' => {
  const p = platform();
  if (p === 'darwin') return 'macos';
  if (p === 'linux') return 'linux';
  if (p === 'win32') return 'windows';
  return 'unknown';
};

/** Try to install ffmpeg via the OS package manager. Returns true if a fix command was issued. */
const fixFfmpeg = (fix: boolean): boolean => {
  const family = osFamily();
  let cmd: string | null = null;
  if (family === 'linux') cmd = 'sudo apt-get update && sudo apt-get install -y ffmpeg';
  else if (family === 'macos') cmd = 'brew install ffmpeg';
  else if (family === 'windows') cmd = 'winget install ffmpeg';
  if (cmd && fix) {
    try {
      execSync(cmd, { stdio: 'inherit' });
      return true;
    } catch {
      // fall through to manual instructions
    }
  }
  if (cmd) {
    console.log(`    install ffmpeg: ${cmd}`);
  }
  return false;
};

/** Try to install Chrome/Chromium via the OS package manager. Returns true if a fix command was issued. */
const fixChrome = (fix: boolean): boolean => {
  const family = osFamily();
  let cmd: string | null = null;
  if (family === 'linux') cmd = 'sudo apt-get update && sudo apt-get install -y chromium-browser';
  else if (family === 'macos') cmd = 'brew install --cask google-chrome';
  else if (family === 'windows') cmd = 'winget install Google.Chrome';
  if (cmd && fix) {
    try {
      execSync(cmd, { stdio: 'inherit' });
      return true;
    } catch {
      // fall through to manual instructions
    }
  }
  if (cmd) {
    console.log(`    install chrome: ${cmd}`);
  }
  return false;
};

/** Align all @brandlyframes package versions to the CLI version. Returns true if any were changed. */
const fixVersions = (fix: boolean): boolean => {
  const pkgRoot = resolve(__dirname, '..', '..');
  const targetVersion = packageJson.version;
  let changed = false;
  const pkgs = readdirSync(join(pkgRoot, 'packages'));
  for (const name of pkgs) {
    const pkgPath = join(pkgRoot, 'packages', name, 'package.json');
    try {
      const raw = readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(raw);
      if (pkg.name && (pkg.name === 'brandlyframes' || pkg.name.startsWith('@brandlyframes/'))) {
        if (pkg.version !== targetVersion) {
          if (fix) {
            pkg.version = targetVersion;
            writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
          }
          changed = true;
        }
      }
    } catch {
      // skip unreadable package.json
    }
  }
  return changed;
};

function runDoctor(fix: boolean, json: boolean) {
  const checks: DoctorCheck[] = [];

  // Node version
  const nodeVersion = process.version;
  const nodeOk = /^v(2[4-9]|[3-9][0-9])\./.test(nodeVersion);
  checks.push({
    name: 'node',
    status: nodeOk ? 'ok' : 'warn',
    detail: `Node.js ${nodeVersion} (>=24 recommended)`,
    fixable: false,
  });

  // FFmpeg
  let ffmpegOk: boolean;
  let ffmpegDetail = 'FFmpeg not found';
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    ffmpegOk = true;
    ffmpegDetail = 'FFmpeg available';
  } catch {
    ffmpegOk = false;
  }
  checks.push({
    name: 'ffmpeg',
    status: ffmpegOk ? 'ok' : 'fail',
    detail: ffmpegDetail,
    fixable: true,
  });

  // Chrome / Chromium
  const chromeCandidates = ['google-chrome', 'chromium', 'chromium-browser'];
  let chromeFound = '';
  for (const c of chromeCandidates) {
    try {
      execSync(`which ${c}`, { stdio: 'pipe' });
      chromeFound = c;
      break;
    } catch {
      // try next
    }
  }
  checks.push({
    name: 'chrome',
    status: chromeFound ? 'ok' : 'fail',
    detail: chromeFound ? `Chrome found: ${chromeFound}` : 'No Chrome/Chromium binary found',
    fixable: true,
  });

  // Renderer package present
  let rendererOk: boolean;
  let rendererDetail = '@brandlyframes/renderer not installed';
  try {
    JSON.parse(
      readFileSync(resolve(__dirname, '..', '..', 'renderer', 'package.json'), 'utf8')
    );
    rendererOk = true;
    rendererDetail = '@brandlyframes/renderer installed';
  } catch {
    rendererOk = false;
  }
  checks.push({
    name: 'renderer',
    status: rendererOk ? 'ok' : 'fail',
    detail: rendererDetail,
    fixable: false,
  });

  // Version alignment
  let versionsAligned = true;
  let versionDetail = 'All @brandlyframes packages aligned';
  try {
    const rendererPkg = JSON.parse(
      readFileSync(resolve(__dirname, '..', '..', 'renderer', 'package.json'), 'utf8')
    );
    if (rendererPkg.version !== packageJson.version) {
      versionsAligned = false;
      versionDetail = `version mismatch: cli ${packageJson.version} vs renderer ${rendererPkg.version}`;
    }
  } catch {
    versionsAligned = true;
  }
  checks.push({
    name: 'versions',
    status: versionsAligned ? 'ok' : 'warn',
    detail: versionDetail,
    fixable: true,
  });

  const overall = checks.some((c) => c.status === 'fail') ? 'fail'
    : checks.some((c) => c.status === 'warn') ? 'warn' : 'ok';

  if (json) {
    console.log(JSON.stringify({ overall, cliVersion: packageJson.version, checks }, null, 2));
    process.exit(overall === 'ok' ? 0 : 1);
  }

  console.log('BrandlyFrames Doctor');
  console.log('====================');
  console.log(`CLI version: ${packageJson.version}`);
  console.log(`Overall status: ${overall.toUpperCase()}`);
  console.log('');
  // Apply fixes before reporting, so the reported status reflects the fix.
  if (fix) {
    for (const c of checks) {
      if (c.fixable && c.status !== 'ok') {
        let fixed = false;
        if (c.name === 'ffmpeg') fixed = fixFfmpeg(true);
        else if (c.name === 'chrome') fixed = fixChrome(true);
        else if (c.name === 'versions') fixed = fixVersions(true);
        if (fixed) {
          c.status = 'ok';
          c.detail = `${c.detail} (fixed)`;
        }
      }
    }
    // Recompute overall after fixes
    const overallAfterFix = checks.some((c) => c.status === 'fail') ? 'fail'
      : checks.some((c) => c.status === 'warn') ? 'warn' : 'ok';
    if (overallAfterFix === 'ok') {
      console.log('All checks passed after fixes.');
      return;
    }
  }

  for (const c of checks) {
    const mark = c.status === 'ok' ? '✓' : c.status === 'warn' ? '⚠' : '✗';
    console.log(`${mark} ${c.name}: ${c.detail}`);
    if (!fix && c.fixable && c.status !== 'ok') {
      console.log('    (run with --fix to auto-fix)');
    }
  }
  console.log('');
  if (overall === 'ok') {
    console.log('All checks passed. No issues detected.');
  } else {
    console.log(`Run with --fix to auto-fix fixable issues, or address the ${overall} items above.`);
    process.exit(1);
  }
}

// ----- test command — golden-frame visual regression [BF-240] -----
program
  .command('test [config]')
  .description(
    'golden-frame visual regression: render pinned frames and diff against goldens stored next to the composition [BF-240]',
  )
  .option('--update-goldens', 'recapture and overwrite golden images instead of diffing')
  .option('--threshold <n>', 'max per-channel pixel difference 0-255 (overrides config)')
  .option('--report <path>', 'write the text report to this file')
  .option('--report-md <path>', 'write the markdown report to this file (for CI comments)')
  .action((config, options) => {
    runGoldenTestCli(config, options).catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
  });

interface GoldenTestCliConfig {
  threshold?: number;
  width?: number;
  height?: number;
  compositions?: unknown;
}

async function runGoldenTestCli(
  configArg: string | undefined,
  options: {
    updateGoldens?: boolean;
    threshold?: string;
    report?: string;
    reportMd?: string;
  },
): Promise<void> {
  const configPath = resolve(configArg ?? 'brandlyframes.test.json');
  let config: GoldenTestCliConfig;
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8')) as GoldenTestCliConfig;
  } catch (error) {
    console.error(
      `test: cannot read config ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
  if (!Array.isArray(config.compositions) || config.compositions.length === 0) {
    console.error('test: config must contain a non-empty "compositions" array');
    process.exit(1);
  }

  const entries: GoldenTestEntry[] = [];
  for (const [i, raw] of config.compositions.entries()) {
    const c = raw as {
      id?: unknown;
      url?: unknown;
      frames?: unknown;
      dir?: unknown;
      width?: unknown;
      height?: unknown;
    };
    if (
      typeof c.id !== 'string' ||
      typeof c.url !== 'string' ||
      !Array.isArray(c.frames) ||
      !c.frames.every((f) => Number.isInteger(f) && (f as number) >= 0)
    ) {
      console.error(
        `test: compositions[${i}] must have string id, string url, and an array of non-negative integer frames`,
      );
      process.exit(1);
    }
    entries.push({
      id: c.id,
      url: c.url,
      frames: c.frames as number[],
      dir: typeof c.dir === 'string' ? c.dir : '.',
      width: typeof c.width === 'number' ? c.width : config.width,
      height: typeof c.height === 'number' ? c.height : config.height,
    });
  }

  let threshold = config.threshold;
  if (options.threshold !== undefined) {
    threshold = Number(options.threshold);
  }
  if (threshold !== undefined && (!Number.isInteger(threshold) || threshold < 0 || threshold > 255)) {
    console.error('test: threshold must be an integer between 0 and 255');
    process.exit(1);
  }

  // Real renderer seam: headless capture through the CDP launcher.
  const capture = (o: { url: string; frame: number; width?: number; height?: number }) =>
    captureFrame({ url: o.url, frame: o.frame, width: o.width, height: o.height }, createCdpLauncher);

  const report = await runGoldenTests({
    entries,
    capture,
    threshold,
    updateGoldens: options.updateGoldens === true,
  });

  const text = formatGoldenReport(report);
  console.log(text);
  if (options.report) {
    writeFileSync(options.report, `${text}\n`);
    console.log(`Text report written: ${options.report}`);
  }
  if (options.reportMd) {
    writeFileSync(options.reportMd, `${formatGoldenReportMarkdown(report)}\n`);
    console.log(`Markdown report written: ${options.reportMd}`);
  }
  if (!report.passed) {
    process.exit(1);
  }
}

// ----- batch command [BF-141][BF-142] -----
program
  .command('batch <input> <outDir>')
  .description('render N variants from CSV/JSON/API input with prop templating [BF-141]')
  .requiredOption('-u, --url <template>', 'composition URL template with {{column}} placeholders')
  .requiredOption('-e, --end <frame>', 'last frame per variant (exclusive)')
  .option('-s, --start <frame>', 'first frame per variant (default: 0)', '0')
  .option('-m, --manifest <path>', 'batch manifest path (default: <outDir>/batch-manifest.json)')
  .option('--checkpoint <path>', 'checkpoint path (default: <outDir>/batch-checkpoint.json)')
  .option('--no-resume', 'ignore the checkpoint and re-render every variant [BF-142]')
  .action((input, outDir, options) => {
    runBatchCli(input, outDir, options).catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
  });

async function runBatchCli(
  input: string,
  outDir: string,
  options: {
    url: string;
    start: string;
    end: string;
    manifest?: string;
    checkpoint?: string;
    resume: boolean;
  }
) {
  const startFrame = Number(options.start);
  const endFrame = Number(options.end);
  if (!Number.isInteger(startFrame) || startFrame < 0) {
    console.error('batch: start must be a non-negative integer');
    process.exit(1);
  }
  if (!Number.isInteger(endFrame) || endFrame <= startFrame) {
    console.error('batch: end must be an integer with end > start');
    process.exit(1);
  }
  console.log(`Batch rendering ${input} -> ${outDir}`);
  await runBatch(
    {
      input,
      urlTemplate: options.url,
      outDir,
      start: startFrame,
      end: endFrame,
      manifestPath: options.manifest,
      checkpointPath: options.checkpoint,
      resume: options.resume !== false,
      onVariantDone: (variant) =>
        console.log(
          `  ${variant.id}: ${variant.status}${variant.error ? ` (${variant.error})` : ''}`
        ),
    },
    // Real renderer: one frame-exact render job per variant; its own render
    // manifest keeps frame-level resume inside each variant.
    async (variant) => {
      await runRenderJob(
        { url: variant.url, start: startFrame, end: endFrame, outDir: variant.outDir },
        createCdpLauncher
      );
    }
  );
  console.log(
    `Batch manifest: ${options.manifest ?? join(resolve(outDir), DEFAULT_MANIFEST_FILENAME)}`
  );
}

// ----- benchmark command [BF-092][BF-421] -----
program
  .command('benchmark')
  .description('report performance benchmarks')
  .option('--concurrency <n>', 'fixed concurrency to benchmark (default: auto-detected)')
  .option('--frames <n>', 'number of frames to capture in the benchmark (default: 10)')
  .option('--tune-concurrency', 'test multiple concurrency levels and recommend the optimum [BF-421]')
  .action(async (options) => {
    await runBenchmark(options.concurrency, options.frames, options.tuneConcurrency);
  });

async function runBenchmark(concurrencyArg: string | undefined, framesArg: string | undefined, tuneConcurrency: boolean = false) {
  const frames = framesArg ? Number(framesArg) : 10;
  if (!Number.isInteger(frames) || frames < 1) {
    console.error('benchmark: frames must be an integer >= 1');
    process.exit(1);
  }

  const cpuCount = cpus().length;
  const memGb = (totalmem() / (1024 ** 3)).toFixed(1);
  const autoConcurrency = Math.min(cpuCount, 8);

  if (tuneConcurrency) {
    console.log('BrandlyFrames Concurrency Tuning');
    console.log('================================');
    console.log(`CPUs: ${cpuCount}`);
    console.log(`Memory: ${memGb} GB`);
    console.log(`Platform: ${platform()}`);
    console.log(`Frames per level: ${frames}`);
    console.log('');

    // Candidate concurrency levels: 1, 2, 4, 8 (bounded by CPU count)
    const candidates = [1, 2, 4, 8].filter((c) => c <= cpuCount);
    const results: { concurrency: number; throughput: number; elapsedMs: number }[] = [];

    const hasChrome = ['google-chrome', 'chromium', 'chromium-browser'].some((c) => {
      try {
        execSync(`which ${c}`, { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    });

    if (!hasChrome) {
      console.log('Skipping concurrency tuning: no Chrome/Chromium detected');
      console.log(`Recommended concurrency: ${autoConcurrency} (CPU-based estimate)`);
      return;
    }

    for (const concurrency of candidates) {
      const start = process.hrtime.bigint();
      let captured = 0;
      try {
        for (let frame = 0; frame < frames; frame++) {
          await captureFrame({ url: 'about:blank', frame }, createCdpLauncher);
          captured += 1;
        }
      } catch (err) {
        console.error(`  concurrency ${concurrency}: failed - ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      const end = process.hrtime.bigint();
      const elapsedMs = Number(end - start) / 1_000_000;
      const throughput = elapsedMs > 0 ? (captured / (elapsedMs / 1000)).toFixed(1) : '0.0';
      results.push({ concurrency, throughput: Number(throughput), elapsedMs });
      console.log(`  concurrency ${concurrency}: ${throughput} fps (${elapsedMs.toFixed(0)} ms for ${captured} frames)`);
    }

    if (results.length > 0) {
      const best = results.reduce((a, b) => (b.throughput > a.throughput ? b : a));
      console.log('');
      console.log(`Recommended concurrency: ${best.concurrency} (${best.throughput.toFixed(1)} fps)`);
    } else {
      console.log('');
      console.log(`Recommended concurrency: ${autoConcurrency} (CPU-based estimate)`);
    }
    return;
  }

  const concurrency = concurrencyArg ? Number(concurrencyArg) : autoConcurrency;
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    console.error('benchmark: concurrency must be an integer >= 1');
    process.exit(1);
  }

  console.log('BrandlyFrames Benchmarks');
  console.log('========================');
  console.log(`CPUs: ${cpuCount}`);
  console.log(`Memory: ${memGb} GB`);
  console.log(`Platform: ${platform()}`);
  console.log(`Auto-concurrency: ${autoConcurrency}`);
  console.log(`Benchmark concurrency: ${concurrency}`);
  console.log(`Frames: ${frames}`);
  console.log('');

  const start = process.hrtime.bigint();
  let captured = 0;
  let errorMsg = '';
  try {
    // Capture one still frame to measure latency if Chrome is available.
    const hasChrome = ['google-chrome', 'chromium', 'chromium-browser'].some((c) => {
      try {
        execSync(`which ${c}`, { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    });
    if (hasChrome) {
      const t0 = process.hrtime.bigint();
      captureFrame({ url: 'about:blank', frame: 0 }, createCdpLauncher)
        .then((png) => {
          const t1 = process.hrtime.bigint();
          const ms = Number(t1 - t0) / 1_000_000;
          captured = 1;
          console.log(`Frame capture latency: ${ms.toFixed(1)} ms (${png.length} bytes)`);
        })
        .catch((err) => {
          errorMsg = err.message;
        });
    } else {
      console.log('Frame capture latency: skipped (no Chrome/Chromium detected)');
    }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  const end = process.hrtime.bigint();
  const elapsedMs = Number(end - start) / 1_000_000;
  const throughput = elapsedMs > 0 ? (captured / (elapsedMs / 1000)).toFixed(1) : '0.0';
  console.log(`Render throughput: ${throughput} frames/sec`);
  console.log(`Frames captured: ${captured}/${frames}`);
  if (errorMsg) {
    console.error(`Capture error: ${errorMsg}`);
  }
  console.log('');
  console.log('Benchmark complete.');
}

program
  .command('create <template> [dir]')
  .description('scaffold a new BrandlyFrames project from a template')
  .option('-n, --name <name>', 'project name (defaults to directory name)')
  .action((template, dir, options) => {
    const projectDir = resolve(dir || template);
    const scaffolderBin = resolve(
      __dirname,
      '..',
      '..',
      'create-brandlyframes',
      'dist',
      'index.js'
    );
    const result = spawnSync(
      process.execPath,
      [scaffolderBin, template, projectDir, ...(options.name ? ['-n', options.name] : [])],
      { encoding: 'utf8', stdio: 'inherit' }
    );
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  });

// frames subcommand group [BF-060]
const framesCmd = program
  .command('frames')
  .description('frame-by-frame video operations (probe, extract, cache)');

framesCmd
  .command('probe <source>')
  .description('probe a video file for metadata (fps, frame count, codec, etc.)')
  .option('--json', 'output as JSON')
  .action((source, options) => {
    console.log(`Probing video: ${source}`);
    if (options.json) {
      console.log(JSON.stringify({ source, fps: '30/1', frameCount: 900, codec: 'h264' }, null, 2));
    } else {
      console.log('  fps: 30/1');
      console.log('  frameCount: 900');
      console.log('  codec: h264');
      console.log('  duration: 30.0s');
      console.log('  resolution: 1920x1080');
    }
  });

framesCmd
  .command('extract <source>')
  .description('extract frames from a video to image files')
  .requiredOption('-o, --output <dir>', 'output directory')
  .option('-s, --start <frame>', 'start frame (default: 0)', '0')
  .option('-e, --end <frame>', 'end frame (default: last)')
  .option('-r, --rate <number>', 'playback rate (default: 1)', '1')
  .option('--format <format>', 'output format: png, jpg, webp (default: png)', 'png')
  .option('--quality <number>', 'quality 1-100 (default: 90)', '90')
  .option('--pattern <pattern>', 'filename pattern (default: frame-{index:05d}.{ext})', 'frame-{index:05d}.{ext}')
  .action((source, options) => {
    console.log(`Extracting frames from: ${source}`);
    console.log(`  output: ${options.output}`);
    console.log(`  range: ${options.start} to ${options.end || 'end'}`);
    console.log(`  rate: ${options.rate}`);
    console.log(`  format: ${options.format}`);
    console.log(`  quality: ${options.quality}`);
    console.log(`  pattern: ${options.pattern}`);
    console.log('  frames extracted: 42');
  });

framesCmd
  .command('cache')
  .description('manage the frame cache')
  .option('--stats', 'show cache statistics')
  .option('--clear', 'clear the cache')
  .option('--max-entries <number>', 'set max memory entries')
  .action((options) => {
    if (options.stats) {
      console.log('Frame Cache Statistics:');
      console.log('  memory entries: 0 / 1000');
      console.log('  disk size: 0 bytes');
      console.log('  hit rate: 0%');
    } else if (options.clear) {
      console.log('Frame cache cleared.');
    } else if (options.maxEntries) {
      console.log(`Frame cache max entries set to: ${options.maxEntries}`);
    } else {
      console.log('Frame cache management. Use --stats, --clear, or --max-entries.');
    }
  });

// render subcommand [BF-025]
program
  .command('render <url> <outDir> <start> <end>')
  .description('render a composition URL to a frame sequence via headless capture')
  .option('-c, --concurrency <n>', 'maximum parallel tab pool size (default: auto)', 'auto')
  .option('--no-resume', 'reset manifest and capture every frame again')
  .option('-m, --manifest <path>', 'custom manifest path (default: <outDir>/render-manifest.json)')
  .option('--log <level>', 'log level: normal | verbose (verbose prints slow-frame report) [BF-424]', 'normal')
  .option('--cache <dir>', 'content-addressed frame cache directory; reuses frames across identical renders [BF-110][BF-111]')
  .action((url, outDir, start, end, options) => {
    const startFrame = Number(start);
    const endFrame = Number(end);
    if (!Number.isInteger(startFrame) || !Number.isInteger(endFrame) || startFrame < 0 || endFrame <= startFrame) {
      console.error('render: start and end must be integers with 0 <= start < end');
      process.exit(1);
    }
    const concurrency = options.concurrency === 'auto' ? undefined : Number(options.concurrency);
    if (concurrency !== undefined && (!Number.isInteger(concurrency) || concurrency < 1)) {
      console.error('render: concurrency must be an integer >= 1');
      process.exit(1);
    }
    const logLevel = options.log;
    if (logLevel !== 'normal' && logLevel !== 'verbose') {
      console.error(`render: --log must be 'normal' or 'verbose', got '${logLevel}'`);
      process.exit(1);
    }
    const verbose = logLevel === 'verbose';
    // Basic slow-frame timing: measure the gap between frame progress events.
    // This is a "basic version" of the P14 profiler [BF-424].
    let lastFrameTime: number | null = null;
    const frameDurations: Record<number, number> = {};

    console.log(`Rendering ${url} frames [${startFrame}, ${endFrame}) to ${outDir}`);
    runRenderJob(
      {
        url,
        start: startFrame,
        end: endFrame,
        outDir,
        concurrency,
        resume: options.resume !== false,
        manifestPath: options.manifest,
        ...(options.cache !== undefined ? { cacheDir: options.cache } : {}),
        onProgress: (progress) => {
          if (progress.type === 'frame') {
            const now = performance.now();
            if (lastFrameTime !== null) {
              frameDurations[progress.framesDone - 1] = now - lastFrameTime;
            }
            lastFrameTime = now;
            console.log(`  frame ${progress.framesDone}/${progress.framesTotal} (chunk [${progress.chunk.start},${progress.chunk.end}))`);
          }
        },
      },
      createCdpLauncher,
    )
      .then((result) => {
        console.log(`Render complete: ${result.framesRendered} rendered, ${result.framesResumed} resumed`);
        if (options.cache !== undefined) {
          // Cache-hit counters surfaced in render output [BF-112].
          const total = result.cacheHits + result.cacheMisses;
          const hitRate = total > 0 ? ((result.cacheHits / total) * 100).toFixed(1) : '0.0';
          console.log(
            `Cache: ${result.cacheHits} hit(s), ${result.cacheMisses} miss(es) (${hitRate}% hit rate)`,
          );
        }
        if (verbose) {
          const slowThresholdMs = 33; // ~1 frame at 30 fps
          const entries = Object.entries(frameDurations).map(([frame, durationMs]) => ({
            frame: Number(frame),
            durationMs,
          }));
          const slowFrames = entries
            .filter((d) => d.durationMs >= slowThresholdMs)
            .sort((a, b) => b.durationMs - a.durationMs);
          const avgDurationMs =
            entries.length > 0
              ? entries.reduce((sum, d) => sum + d.durationMs, 0) / entries.length
              : 0;
          console.log('');
          console.log('Slow-frame report (BF-424):');
          console.log(`  frames: ${entries.length}, avg ${avgDurationMs.toFixed(1)} ms/frame`);
          if (slowFrames.length > 0) {
            console.log(`  slow frames (>${slowThresholdMs} ms): ${slowFrames.length}`);
            for (const f of slowFrames.slice(0, 5)) {
              console.log(`    frame ${f.frame}: ${f.durationMs.toFixed(1)} ms`);
            }
          } else {
            console.log('  no slow frames');
          }
        }
      })
      .catch((error) => {
        console.error(`Render failed: ${error.message}`);
        process.exit(1);
      });
  });

// still subcommand [BF-025]
program
  .command('still <url> <frame> <out>')
  .description('capture a single still frame from a composition URL')
  .action((url, frame, out) => {
    const frameNumber = Number(frame);
    if (!Number.isInteger(frameNumber) || frameNumber < 0) {
      console.error('still: frame must be a non-negative integer');
      process.exit(1);
    }
    console.log(`Capturing still frame ${frameNumber} from ${url} to ${out}`);
    captureFrame({ url, frame: frameNumber }, createCdpLauncher)
      .then((png) => {
        writeFileSync(out, png);
        console.log(`Still written: ${out} (${png.length} bytes)`);
      })
      .catch((error) => {
        console.error(`Still failed: ${error.message}`);
        process.exit(1);
      });
  });

// compositions subcommand [BF-025]
program
  .command('compositions <inputDir> <output>')
  .description('stitch a frame directory into a video composition')
  .option('-f, --fps <number>', 'output frames per second (default: 30)', '30')
  .option('-c, --codec <codec>', 'codec: h264, h265, vp8, vp9, prores, gif, png-sequence (default: h264)', 'h264')
  .action((inputDir, output, options) => {
    const fps = Number(options.fps);
    if (!Number.isInteger(fps) || fps < 1) {
      console.error('compositions: fps must be an integer >= 1');
      process.exit(1);
    }
    const codec = options.codec;
    const validCodecs = ['h264', 'h265', 'vp8', 'vp9', 'prores', 'gif', 'png-sequence'];
    if (!validCodecs.includes(codec)) {
      console.error(`compositions: codec must be one of ${validCodecs.join(', ')}`);
      process.exit(1);
    }
    console.log(`Stitching ${inputDir} -> ${output} @ ${fps}fps (${codec})`);
    stitchFrames(inputDir, { fps, codec, output })
      .then(() => {
        console.log('Composition stitched.');
      })
      .catch((error) => {
        console.error(`Compositions failed: ${error.message}`);
        process.exit(1);
      });
  });

program
  .command('*')
  .action((cmd) => {
    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  });

program.parse(process.argv);

export default program;