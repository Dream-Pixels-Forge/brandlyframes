import { describe, it, expect, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('create-brandlyframes CLI', () => {
  const cliBin = resolve('./dist/index.js');

  afterEach(() => {
    // Clean up any leftover scaffolded dirs from tests
    const leftover = resolve('./test-output');
    try {
      rmSync(leftover, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('should output the version when called with --version', () => {
    const output = execSync(`node ${cliBin} --version`, { encoding: 'utf8' });
    expect(output.trim()).toBe('0.1.0');
  });

  it('should output help when called with --help', () => {
    const output = execSync(`node ${cliBin} --help`, { encoding: 'utf8' });
    expect(output).toContain('Usage:');
    expect(output).toContain('Options:');
    expect(output).toContain('--list');
    expect(output).toContain('--name');
  });

  it('should list available templates with -l/--list', () => {
    const output = execSync(`node ${cliBin} -l`, { encoding: 'utf8' });
    for (const tpl of ['blank', 'hello-world', 'captions', 'product-promo', 'frame-video-demo']) {
      expect(output).toContain(tpl);
    }
  });

  it('should list available templates with --list', () => {
    const output = execSync(`node ${cliBin} --list`, { encoding: 'utf8' });
    for (const tpl of ['blank', 'hello-world', 'captions', 'product-promo', 'frame-video-demo']) {
      expect(output).toContain(tpl);
    }
  });

  it('should scaffold a blank project into a temp dir', () => {
    const projectDir = join(tmpdir(), `bf-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try {
      const output = execSync(`node ${cliBin} blank ${projectDir} -n blank`, { encoding: 'utf8' });
      expect(output).toContain(`using the "blank" template`);
      expect(output).toContain(projectDir);
      // package.json should be rewritten
      const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'));
      expect(pkg.name).toBe('blank');
      expect(pkg.description).toContain('Minimal empty BrandlyFrames project');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('should scaffold hello-world project', () => {
    const projectDir = join(tmpdir(), `bf-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try {
      const output = execSync(`node ${cliBin} hello-world ${projectDir} -n hello-world`, { encoding: 'utf8' });
      expect(output).toContain(`using the "hello-world" template`);
      const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'));
      expect(pkg.name).toBe('hello-world');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('should scaffold captions project', () => {
    const projectDir = join(tmpdir(), `bf-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try {
      const output = execSync(`node ${cliBin} captions ${projectDir} -n captions`, { encoding: 'utf8' });
      expect(output).toContain(`using the "captions" template`);
      const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'));
      expect(pkg.name).toBe('captions');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('should scaffold product-promo project', () => {
    const projectDir = join(tmpdir(), `bf-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try {
      const output = execSync(`node ${cliBin} product-promo ${projectDir} -n product-promo`, { encoding: 'utf8' });
      expect(output).toContain(`using the "product-promo" template`);
      const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'));
      expect(pkg.name).toBe('product-promo');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('should scaffold frame-video-demo project', () => {
    const projectDir = join(tmpdir(), `bf-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try {
      const output = execSync(`node ${cliBin} frame-video-demo ${projectDir} -n frame-video-demo`, { encoding: 'utf8' });
      expect(output).toContain(`using the "frame-video-demo" template`);
      const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'));
      expect(pkg.name).toBe('frame-video-demo');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('should use --name option for project name', () => {
    const projectDir = join(tmpdir(), `bf-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try {
      const output = execSync(`node ${cliBin} blank ${projectDir} -n my-custom-project`, {
        encoding: 'utf8',
      });
      expect(output).toContain('Created my-custom-project');
      const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf8'));
      expect(pkg.name).toBe('my-custom-project');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('should reject an unknown template', () => {
    let error: Error | null = null;
    try {
      execSync(`node ${cliBin} nonexistent-template /tmp/bf-nonexistent`, {
        encoding: 'utf8',
      });
    } catch (err) {
      error = err as Error;
    }
    expect(error).not.toBeNull();
    const stderr = (error as Error & { stderr?: string }).stderr ?? '';
    expect(stderr).toContain('Unknown template: nonexistent-template');
  });

  it('should reject scaffolding into an existing directory', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'bf-test-'));
    try {
      let error: Error | null = null;
      try {
        execSync(`node ${cliBin} blank ${projectDir}`, {
          encoding: 'utf8',
        });
      } catch (err) {
        error = err as Error;
      }
      expect(error).not.toBeNull();
      const stderr = (error as Error & { stderr?: string }).stderr ?? '';
      expect(stderr).toContain('Directory already exists');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
