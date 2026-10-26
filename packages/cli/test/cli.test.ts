import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

describe('CLI', () => {
  const cliBin = resolve('./dist/index.js');

  // Every test below subprocess-spawns the CLI binary via `execSync`. On a cold
  // filesystem (fresh install / CI runner) the first spawn alone can exceed
  // vitest's default 5s per-test timeout (~6.5s observed for the benchmark
  // command), so each subprocess test gets an explicit 15s timeout. Assertions
  // and logic are unchanged.
  const TEST_TIMEOUT = 15_000;

  // `doctor` is a health check: it exits non-zero when any check fails (e.g.
  // ffmpeg missing on CI runners), which makes `execSync` throw even though the
  // command produced its full diagnostics output. These tests assert doctor's
  // *output contract*, not machine health, so capture stdout from the thrown
  // error and assert exit-code semantics separately.
  function runDoctorCli(args: string): { stdout: string; exitCode: number } {
    try {
      const stdout = execSync(`node ${cliBin} doctor ${args}`, { encoding: 'utf8' });
      return { stdout, exitCode: 0 };
    } catch (err) {
      const e = err as { status?: number; stdout?: string };
      return { stdout: e.stdout ?? '', exitCode: e.status ?? 1 };
    }
  }

  it('should output the version when called with --version', () => {
    const output = execSync(`node ${cliBin} --version`, { encoding: 'utf8' });
    expect(output.trim()).toBe(packageJson.version);
  }, TEST_TIMEOUT);

  it('should output help when called with --help', () => {
    const output = execSync(`node ${cliBin} --help`, { encoding: 'utf8' });
    expect(output).toContain('Usage:');
    expect(output).toContain('Options:');
  }, TEST_TIMEOUT);

  it('should output usage when called with dev command', () => {
    const output = execSync(`node ${cliBin} dev`, { encoding: 'utf8' });
    expect(output).toContain('Starting development server...');
  }, TEST_TIMEOUT);

  it('should output usage when called with build command', () => {
    const output = execSync(`node ${cliBin} build`, { encoding: 'utf8' });
    expect(output).toContain('Building composition...');
  }, TEST_TIMEOUT);

  it('should output usage when called with export command', () => {
    const output = execSync(`node ${cliBin} export`, { encoding: 'utf8' });
    expect(output).toContain('Exporting to platform-specific formats...');
  }, TEST_TIMEOUT);

  it('should output usage when called with upgrade command', () => {
    const output = execSync(`node ${cliBin} upgrade`, { encoding: 'utf8' });
    expect(output).toContain('BrandlyFrames SDK Upgrade');
    expect(output).toContain('Usage:');
  }, TEST_TIMEOUT);

  it('should output usage when called with doctor command', () => {
    const { stdout: output, exitCode } = runDoctorCli('');
    expect(output).toContain('BrandlyFrames Doctor');
    expect(output).toContain('Overall status:');
    expect(output).toContain(`CLI version: ${packageJson.version}`);
    if (output.includes('Overall status: OK')) expect(exitCode).toBe(0);
    else expect(exitCode).toBe(1);
  }, TEST_TIMEOUT);

  it('should output usage when called with benchmark command', () => {
    const output = execSync(`node ${cliBin} benchmark`, { encoding: 'utf8' });
    expect(output).toContain('BrandlyFrames Benchmarks');
    expect(output).toContain('Render throughput');
  }, 60_000);

  // frames subcommands [BF-060]
  it('should output frames probe help', () => {
    const output = execSync(`node ${cliBin} frames probe --help`, { encoding: 'utf8' });
    expect(output).toContain('probe a video file for metadata');
    expect(output).toContain('--json');
  }, TEST_TIMEOUT);

  it('should output frames extract help', () => {
    const output = execSync(`node ${cliBin} frames extract --help`, { encoding: 'utf8' });
    expect(output).toContain('extract frames from a video to image files');
    expect(output).toContain('--output');
    expect(output).toContain('--format');
  }, TEST_TIMEOUT);

  it('should output frames cache help', () => {
    const output = execSync(`node ${cliBin} frames cache --help`, { encoding: 'utf8' });
    expect(output).toContain('manage the frame cache');
    expect(output).toContain('--stats');
    expect(output).toContain('--clear');
  }, TEST_TIMEOUT);

  it('should run frames probe command', () => {
    const output = execSync(`node ${cliBin} frames probe test.mp4`, { encoding: 'utf8' });
    expect(output).toContain('Probing video: test.mp4');
    expect(output).toContain('fps: 30/1');
    expect(output).toContain('frameCount: 900');
  }, TEST_TIMEOUT);

  it('should run frames probe with --json', () => {
    const output = execSync(`node ${cliBin} frames probe test.mp4 --json`, { encoding: 'utf8' });
    expect(output).toContain('"fps": "30/1"');
    expect(output).toContain('"frameCount": 900');
  }, TEST_TIMEOUT);

  it('should run frames extract command', () => {
    const output = execSync(`node ${cliBin} frames extract test.mp4 -o /tmp/output`, { encoding: 'utf8' });
    expect(output).toContain('Extracting frames from: test.mp4');
    expect(output).toContain('output: /tmp/output');
  }, TEST_TIMEOUT);

  it('should run frames cache --stats', () => {
    const output = execSync(`node ${cliBin} frames cache --stats`, { encoding: 'utf8' });
    expect(output).toContain('Frame Cache Statistics');
    expect(output).toContain('memory entries');
  }, TEST_TIMEOUT);

  // render subcommand [BF-025]
  it('should render command reject an invalid frame range', () => {
    let error: Error | null = null;
    try {
      execSync(`node ${cliBin} render http://example.com /tmp/out 10 0`, {
        encoding: 'utf8',
      });
    } catch (err) {
      error = err as Error;
    }
    expect(error).not.toBeNull();
    expect((error as Error & { status?: number }).status).not.toBe(0);
    const stderr = (error as Error & { stderr?: string }).stderr ?? '';
    expect(stderr).toContain('start and end must be integers');
  }, TEST_TIMEOUT);

  it('should render command reject a negative start frame', () => {
    let error: Error | null = null;
    try {
      execSync(`node ${cliBin} render http://example.com /tmp/out -- -1 10`, {
        encoding: 'utf8',
      });
    } catch (err) {
      error = err as Error;
    }
    expect(error).not.toBeNull();
    const stderr = (error as Error & { stderr?: string }).stderr ?? '';
    expect(stderr).toContain('0 <= start < end');
  }, TEST_TIMEOUT);

  // still subcommand [BF-025]
  it('should still command reject a negative frame', () => {
    let error: Error | null = null;
    try {
      execSync(`node ${cliBin} still http://example.com -- -1 /tmp/out.png`, {
        encoding: 'utf8',
      });
    } catch (err) {
      error = err as Error;
    }
    expect(error).not.toBeNull();
    const stderr = (error as Error & { stderr?: string }).stderr ?? '';
    expect(stderr).toContain('frame must be a non-negative integer');
  }, TEST_TIMEOUT);

  it('should still command reject a non-integer frame', () => {
    let error: Error | null = null;
    try {
      execSync(`node ${cliBin} still http://example.com abc /tmp/out.png`, {
        encoding: 'utf8',
      });
    } catch (err) {
      error = err as Error;
    }
    expect(error).not.toBeNull();
    const stderr = (error as Error & { stderr?: string }).stderr ?? '';
    expect(stderr).toContain('frame must be a non-negative integer');
  }, TEST_TIMEOUT);

  // compositions subcommand [BF-025]
  it('should compositions command reject an invalid codec', () => {
    let error: Error | null = null;
    try {
      execSync(`node ${cliBin} compositions /tmp/frames /tmp/out.mp4 -c av1`, {
        encoding: 'utf8',
      });
    } catch (err) {
      error = err as Error;
    }
    expect(error).not.toBeNull();
    const stderr = (error as Error & { stderr?: string }).stderr ?? '';
    expect(stderr).toContain('codec must be one of');
  }, TEST_TIMEOUT);

  it('should compositions command reject fps below 1', () => {
    let error: Error | null = null;
    try {
      execSync(`node ${cliBin} compositions /tmp/frames /tmp/out.mp4 -f 0`, {
        encoding: 'utf8',
      });
    } catch (err) {
      error = err as Error;
    }
    expect(error).not.toBeNull();
    const stderr = (error as Error & { stderr?: string }).stderr ?? '';
    expect(stderr).toContain('fps must be an integer >= 1');
  }, TEST_TIMEOUT);

  // create subcommand [BF-090]
  it('should create command scaffold a blank project', () => {
    const projectDir = join(tmpdir(), `bf-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const output = execSync(`node ${cliBin} create blank ${projectDir} -n my-project`, {
      encoding: 'utf8',
    });
    expect(output).toContain('using the "blank" template');
    expect(output).toContain(projectDir);
  }, TEST_TIMEOUT);

  it('should create command reject an unknown template', () => {
    let error: Error | null = null;
    try {
      execSync(`node ${cliBin} create nonexistent-template /tmp/bf-cli-nonexistent`, {
        encoding: 'utf8',
      });
    } catch (err) {
      error = err as Error;
    }
    expect(error).not.toBeNull();
    const stderr = (error as Error & { stderr?: string }).stderr ?? '';
    expect(stderr).toContain('Unknown template: nonexistent-template');
  }, TEST_TIMEOUT);

  // upgrade command [BF-092][BF-480]
  it('should upgrade --check report aligned versions', () => {
    const output = execSync(`node ${cliBin} upgrade --check`, { encoding: 'utf8' });
    expect(output).toContain('Checking for version mismatches');
    expect(output).toContain('All @brandlyframes packages aligned');
  }, TEST_TIMEOUT);

  it('should upgrade with unknown codemod fail', () => {
    let error: Error | null = null;
    try {
      execSync(`node ${cliBin} upgrade --codemod nonexistent-codemod`, {
        encoding: 'utf8',
      });
    } catch (err) {
      error = err as Error;
    }
    expect(error).not.toBeNull();
    const stderr = (error as Error & { stderr?: string }).stderr ?? '';
    expect(stderr).toContain('Unknown codemod');
  }, TEST_TIMEOUT);

  // doctor command [BF-092][BF-430]
  it('should doctor output diagnostics summary', () => {
    const { stdout: output, exitCode } = runDoctorCli('');
    expect(output).toContain('BrandlyFrames Doctor');
    expect(output).toContain('Overall status:');
    expect(output).toContain(`CLI version: ${packageJson.version}`);
    if (output.includes('Overall status: OK')) expect(exitCode).toBe(0);
    else expect(exitCode).toBe(1);
  }, TEST_TIMEOUT);

  it('should doctor --json output valid JSON', () => {
    const { stdout: output, exitCode } = runDoctorCli('--json');
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('overall');
    expect(parsed).toHaveProperty('checks');
    expect(Array.isArray(parsed.checks)).toBe(true);
    expect(parsed.checks.some((c: { name: string }) => c.name === 'ffmpeg')).toBe(true);
    expect(parsed.checks.some((c: { name: string }) => c.name === 'chrome')).toBe(true);
    expect(parsed.overall === 'ok' ? 0 : 1).toBe(exitCode);
  }, TEST_TIMEOUT);

  // benchmark command [BF-092][BF-421]
  it('should benchmark output report', () => {
    const output = execSync(`node ${cliBin} benchmark`, { encoding: 'utf8' });
    expect(output).toContain('BrandlyFrames Benchmarks');
    expect(output).toContain('CPUs:');
    expect(output).toContain('Auto-concurrency:');
    expect(output).toContain('Benchmark concurrency:');
    expect(output).toContain('Render throughput:');
    expect(output).toContain('Benchmark complete.');
  }, TEST_TIMEOUT);

  it('should benchmark reject invalid frames', () => {
    let error: Error | null = null;
    try {
      execSync(`node ${cliBin} benchmark --frames abc`, {
        encoding: 'utf8',
      });
    } catch (err) {
      error = err as Error;
    }
    expect(error).not.toBeNull();
    const stderr = (error as Error & { stderr?: string }).stderr ?? '';
    expect(stderr).toContain('frames must be an integer >= 1');
  }, TEST_TIMEOUT);

  // test command — golden-frame visual regression [BF-240]
  it('should test --help list golden-frame options', () => {
    const output = execSync(`node ${cliBin} test --help`, { encoding: 'utf8' });
    expect(output).toContain('golden');
    expect(output).toContain('--update-goldens');
    expect(output).toContain('--threshold');
  }, TEST_TIMEOUT);

  it('should test with a missing config exit non-zero with a readable error', () => {
    let error: Error | null = null;
    try {
      execSync(`node ${cliBin} test does-not-exist.test.json`, { encoding: 'utf8' });
    } catch (err) {
      error = err as Error;
    }
    expect(error).not.toBeNull();
    const e = error as Error & { stderr?: string; status?: number };
    expect(`${e.stderr ?? ''}${e.message}`).toContain('cannot read config');
    expect(e.status).not.toBe(0);
  }, TEST_TIMEOUT);

  it('should test with a malformed config exit non-zero', () => {
    const badConfig = join(tmpdir(), `bf-bad-config-${Date.now()}.json`);
    writeFileSync(badConfig, '{ not json');
    try {
      let error: Error | null = null;
      try {
        execSync(`node ${cliBin} test ${badConfig}`, { encoding: 'utf8' });
      } catch (err) {
        error = err as Error;
      }
      expect(error).not.toBeNull();
    } finally {
      rmSync(badConfig, { force: true });
    }
  }, TEST_TIMEOUT);

  it('should test with a config missing compositions exit non-zero', () => {
    const badConfig = join(tmpdir(), `bf-empty-config-${Date.now()}.json`);
    writeFileSync(badConfig, JSON.stringify({ threshold: 2 }));
    try {
      let error: Error | null = null;
      try {
        execSync(`node ${cliBin} test ${badConfig}`, { encoding: 'utf8' });
      } catch (err) {
        error = err as Error;
      }
      expect(error).not.toBeNull();
      const e = error as Error & { stderr?: string };
      expect(`${e.stderr ?? ''}${e.message}`).toContain('compositions');
    } finally {
      rmSync(badConfig, { force: true });
    }
  }, TEST_TIMEOUT);

  // benchmark --scenes: side-by-side render-path comparison [BF-203]
  it('should benchmark --scenes print the comparison table or an honest skip', () => {
    const output = execSync(`node ${cliBin} benchmark --scenes`, {
      encoding: 'utf8',
      timeout: 120_000,
    });
    expect(output).toContain('Standard Scenes');
    // Either real measured numbers, or an explicit honest skip — never a
    // fabricated 3x claim.
    const measured = output.includes('Measured aggregate speedup');
    const skipped = output.includes('screenshot baseline: unavailable');
    expect(measured || skipped).toBe(true);
    if (measured) {
      expect(output).toMatch(/Measured aggregate speedup: \d+\.\d+x/);
      expect(output).toMatch(/tolerance/i);
    }
  }, 150_000);
});
