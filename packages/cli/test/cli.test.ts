import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

describe('CLI', () => {
  const cliBin = resolve('./dist/index.js');

  it('should output the version when called with --version', () => {
    const output = execSync(`node ${cliBin} --version`, { encoding: 'utf8' });
    expect(output.trim()).toBe('0.1.0');
  });

  it('should output help when called with --help', () => {
    const output = execSync(`node ${cliBin} --help`, { encoding: 'utf8' });
    expect(output).toContain('Usage:');
    expect(output).toContain('Options:');
  });

  it('should output usage when called with dev command', () => {
    const output = execSync(`node ${cliBin} dev`, { encoding: 'utf8' });
    expect(output).toContain('Starting development server...');
  });

  it('should output usage when called with build command', () => {
    const output = execSync(`node ${cliBin} build`, { encoding: 'utf8' });
    expect(output).toContain('Building composition...');
  });

  it('should output usage when called with export command', () => {
    const output = execSync(`node ${cliBin} export`, { encoding: 'utf8' });
    expect(output).toContain('Exporting to platform-specific formats...');
  });

  it('should output usage when called with upgrade command', () => {
    const output = execSync(`node ${cliBin} upgrade`, { encoding: 'utf8' });
    expect(output).toContain('BrandlyFrames SDK Upgrade');
    expect(output).toContain('Usage:');
  });

  it('should output usage when called with doctor command', () => {
    const output = execSync(`node ${cliBin} doctor`, { encoding: 'utf8' });
    expect(output).toContain('BrandlyFrames Doctor');
    expect(output).toContain('Overall status:');
    expect(output).toContain(`CLI version: ${packageJson.version}`);
  });

  it('should output usage when called with benchmark command', () => {
    const output = execSync(`node ${cliBin} benchmark`, { encoding: 'utf8' });
    expect(output).toContain('BrandlyFrames Benchmarks');
    expect(output).toContain('Render throughput');
  });

  // frames subcommands [BF-060]
  it('should output frames probe help', () => {
    const output = execSync(`node ${cliBin} frames probe --help`, { encoding: 'utf8' });
    expect(output).toContain('probe a video file for metadata');
    expect(output).toContain('--json');
  });

  it('should output frames extract help', () => {
    const output = execSync(`node ${cliBin} frames extract --help`, { encoding: 'utf8' });
    expect(output).toContain('extract frames from a video to image files');
    expect(output).toContain('--output');
    expect(output).toContain('--format');
  });

  it('should output frames cache help', () => {
    const output = execSync(`node ${cliBin} frames cache --help`, { encoding: 'utf8' });
    expect(output).toContain('manage the frame cache');
    expect(output).toContain('--stats');
    expect(output).toContain('--clear');
  });

  it('should run frames probe command', () => {
    const output = execSync(`node ${cliBin} frames probe test.mp4`, { encoding: 'utf8' });
    expect(output).toContain('Probing video: test.mp4');
    expect(output).toContain('fps: 30/1');
    expect(output).toContain('frameCount: 900');
  });

  it('should run frames probe with --json', () => {
    const output = execSync(`node ${cliBin} frames probe test.mp4 --json`, { encoding: 'utf8' });
    expect(output).toContain('"fps": "30/1"');
    expect(output).toContain('"frameCount": 900');
  });

  it('should run frames extract command', () => {
    const output = execSync(`node ${cliBin} frames extract test.mp4 -o /tmp/output`, { encoding: 'utf8' });
    expect(output).toContain('Extracting frames from: test.mp4');
    expect(output).toContain('output: /tmp/output');
  });

  it('should run frames cache --stats', () => {
    const output = execSync(`node ${cliBin} frames cache --stats`, { encoding: 'utf8' });
    expect(output).toContain('Frame Cache Statistics');
    expect(output).toContain('memory entries');
  });

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
  });

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
  });

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
  });

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
  });

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
  });

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
  });

  // create subcommand [BF-090]
  it('should create command scaffold a blank project', () => {
    const projectDir = join(tmpdir(), `bf-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const output = execSync(`node ${cliBin} create blank ${projectDir} -n my-project`, {
      encoding: 'utf8',
    });
    expect(output).toContain('using the "blank" template');
    expect(output).toContain(projectDir);
  });

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
  });

  // upgrade command [BF-092][BF-480]
  it('should upgrade --check report aligned versions', () => {
    const output = execSync(`node ${cliBin} upgrade --check`, { encoding: 'utf8' });
    expect(output).toContain('Checking for version mismatches');
    expect(output).toContain('All @brandlyframes packages aligned');
  });

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
  });

  // doctor command [BF-092][BF-430]
  it('should doctor output diagnostics summary', () => {
    const output = execSync(`node ${cliBin} doctor`, { encoding: 'utf8' });
    expect(output).toContain('BrandlyFrames Doctor');
    expect(output).toContain('Overall status:');
    expect(output).toContain(`CLI version: ${packageJson.version}`);
  });

  it('should doctor --json output valid JSON', () => {
    const output = execSync(`node ${cliBin} doctor --json`, { encoding: 'utf8' });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('overall');
    expect(parsed).toHaveProperty('checks');
    expect(Array.isArray(parsed.checks)).toBe(true);
    expect(parsed.checks.some((c: { name: string }) => c.name === 'ffmpeg')).toBe(true);
    expect(parsed.checks.some((c: { name: string }) => c.name === 'chrome')).toBe(true);
  });

  // benchmark command [BF-092][BF-421]
  it('should benchmark output report', () => {
    const output = execSync(`node ${cliBin} benchmark`, { encoding: 'utf8' });
    expect(output).toContain('BrandlyFrames Benchmarks');
    expect(output).toContain('CPUs:');
    expect(output).toContain('Auto-concurrency:');
    expect(output).toContain('Benchmark concurrency:');
    expect(output).toContain('Render throughput:');
    expect(output).toContain('Benchmark complete.');
  });

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
  });
});