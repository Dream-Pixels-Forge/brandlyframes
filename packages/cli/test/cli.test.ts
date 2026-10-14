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
});