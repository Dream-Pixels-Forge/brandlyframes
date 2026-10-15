import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

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
    expect(output).toContain('Checking for upgrades...');
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
});