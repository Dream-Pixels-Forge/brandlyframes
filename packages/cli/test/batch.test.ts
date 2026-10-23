/**
 * Batch rendering tests [BF-141][BF-142].
 *
 * `applyTemplate` / `loadBatchInput` / `runBatch` are the pure layer tested
 * here with a fake renderer (no Chrome): prop templating from CSV/JSON/API
 * input, batch manifest output, and crash-resume via the checkpoint file
 * with a simulated crash proving resume skips completed variants.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  applyTemplate,
  loadBatchInput,
  runBatch,
  DEFAULT_CHECKPOINT_FILENAME,
  DEFAULT_MANIFEST_FILENAME,
  type BatchOptions,
  type BatchRendererFn,
  type BatchVariant,
} from '../src/batch';

const TEST_TIMEOUT = 15_000;

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'bf-batch-test-'));
}

/** Fake renderer: records rendered variant ids, optionally simulating crashes. */
function makeFakeRenderer() {
  const state = { rendered: [] as string[], failIds: [] as string[], failRepeat: false };
  const render: BatchRendererFn = async (variant: BatchVariant) => {
    if (state.failIds.includes(variant.id)) {
      // Simulate a hard crash: everything from the failing variant onward dies
      // until `failRepeat` is cleared (the "process restart").
      if (!state.failRepeat) state.failIds = state.failIds.filter((id) => id !== variant.id);
      throw new Error(`simulated crash in ${variant.id}`);
    }
    state.rendered.push(variant.id);
  };
  return { render, state };
}

function batchOptions(overrides: Partial<BatchOptions> & Pick<BatchOptions, 'input' | 'outDir'>): BatchOptions {
  return {
    urlTemplate: 'http://localhost:3000?name={{name}}',
    end: 5,
    resume: true,
    ...overrides,
  };
}

describe('applyTemplate [BF-141]', () => {
  it('substitutes {{column}} placeholders with row props', () => {
    expect(applyTemplate('http://x/?name={{name}}&color={{ color }}', { name: 'Ada', color: 'red' })).toBe(
      'http://x/?name=Ada&color=red'
    );
  });

  it('returns the template unchanged when there are no placeholders', () => {
    expect(applyTemplate('http://x/?static=1', { name: 'Ada' })).toBe('http://x/?static=1');
  });

  it('throws when the template references a missing column', () => {
    expect(() => applyTemplate('http://x/?n={{missing}}', { name: 'Ada' })).toThrow(/missing prop "missing"/);
  });
});

describe('loadBatchInput [BF-141]', () => {
  const dirs: string[] = [];
  const tempDir = () => {
    const dir = makeTempDir();
    dirs.push(dir);
    return dir;
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('parses CSV with headers and quoted fields into row objects', async () => {
    const dir = tempDir();
    const file = join(dir, 'rows.csv');
    writeFileSync(file, 'name,color\nAda,red\n"Grace, H",blue\n');
    expect(await loadBatchInput(file)).toEqual([
      { name: 'Ada', color: 'red' },
      { name: 'Grace, H', color: 'blue' },
    ]);
  });

  it('parses a JSON array of objects, coercing values to strings', async () => {
    const dir = tempDir();
    const file = join(dir, 'rows.json');
    writeFileSync(file, JSON.stringify([{ name: 'Ada', count: 3 }, { name: 'Grace' }]));
    expect(await loadBatchInput(file)).toEqual([
      { name: 'Ada', count: '3' },
      { name: 'Grace' }, // absent keys stay absent; {{count}} templating throws fail-fast
    ]);
  });

  it('fetches API input (http(s) URL) and parses the JSON response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([{ name: 'Ada' }]), { status: 200 }))
    );
    expect(await loadBatchInput('https://api.example.com/rows')).toEqual([{ name: 'Ada' }]);
  });

  it('rejects when the API fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    await expect(loadBatchInput('https://api.example.com/rows')).rejects.toThrow(/fetch failed.*500/);
  });

  it('rejects when a JSON file is not an array of objects', async () => {
    const dir = tempDir();
    const file = join(dir, 'bad.json');
    writeFileSync(file, '{"name":"Ada"}');
    await expect(loadBatchInput(file)).rejects.toThrow(/array of row objects/);
  });
});

describe('runBatch [BF-141]', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function writeJsonInput(rows: Array<{ name: string }>): string {
    const dir = makeTempDir();
    dirs.push(dir);
    const file = join(dir, 'rows.json');
    writeFileSync(file, JSON.stringify(rows));
    return file;
  }

  it('renders every variant and writes the batch manifest + checkpoint', async () => {
    const input = writeJsonInput([{ name: 'Ada' }, { name: 'Grace' }, { name: 'Linus' }]);
    const outDir = makeTempDir();
    dirs.push(outDir);
    const { render, state } = makeFakeRenderer();

    const manifest = await runBatch(batchOptions({ input, outDir }), render);

    expect(state.rendered).toEqual(['variant-0', 'variant-1', 'variant-2']);
    expect(manifest.total).toBe(3);
    expect(manifest.variants.map((v) => v.status)).toEqual(['completed', 'completed', 'completed']);
    expect(manifest.variants[0].url).toBe('http://localhost:3000?name=Ada');
    expect(manifest.variants[0].outDir).toContain('variant-0');

    const onDisk = JSON.parse(readFileSync(join(outDir, DEFAULT_MANIFEST_FILENAME), 'utf8'));
    expect(onDisk.version).toBe(1);
    expect(onDisk.total).toBe(3);
    expect(onDisk.variants.map((v: BatchVariant) => v.id)).toEqual([
      'variant-0',
      'variant-1',
      'variant-2',
    ]);
    const checkpoint = JSON.parse(readFileSync(join(outDir, DEFAULT_CHECKPOINT_FILENAME), 'utf8'));
    expect(checkpoint.completed).toEqual(['variant-0', 'variant-1', 'variant-2']);
  });

  it('marks a failed variant in the manifest and rejects with a failure summary', async () => {
    const input = writeJsonInput([{ name: 'Ada' }, { name: 'Grace' }]);
    const outDir = makeTempDir();
    dirs.push(outDir);
    const flaky = makeFakeRenderer();
    flaky.state.failIds = ['variant-1'];
    await expect(runBatch(batchOptions({ input, outDir }), flaky.render)).rejects.toThrow(/1 of 2 variant\(s\) failed/);

    const onDisk = JSON.parse(readFileSync(join(outDir, DEFAULT_MANIFEST_FILENAME), 'utf8'));
    expect(onDisk.variants[0].status).toBe('completed');
    expect(onDisk.variants[1].status).toBe('failed');
    expect(onDisk.variants[1].error).toContain('simulated crash in variant-1');
  });

  it('throws when the input has no rows', async () => {
    const input = writeJsonInput([]);
    const outDir = makeTempDir();
    dirs.push(outDir);
    const { render } = makeFakeRenderer();
    await expect(runBatch(batchOptions({ input, outDir }), render)).rejects.toThrow(/no input rows/);
  });
});

describe('crash-resume [BF-142]', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('resumes after a simulated crash and skips completed variants', async () => {
    const dir = makeTempDir();
    dirs.push(dir);
    const input = join(dir, 'rows.json');
    writeFileSync(input, JSON.stringify([{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }, { name: 'e' }]));
    const outDir = join(dir, 'out');

    // Run 1: crash after 3 completions (variants 3 and 4 die with the process).
    const crashed = makeFakeRenderer();
    crashed.state.failIds = ['variant-3', 'variant-4'];
    await expect(runBatch(batchOptions({ input, outDir }), crashed.render)).rejects.toThrow(
      /2 of 5 variant\(s\) failed/
    );
    expect(crashed.state.rendered).toEqual(['variant-0', 'variant-1', 'variant-2']);

    // Run 2: process restarted, renderer healthy — only the unfinished run.
    const resumed = makeFakeRenderer();
    const manifest = await runBatch(batchOptions({ input, outDir }), resumed.render);

    expect(resumed.state.rendered).toEqual(['variant-3', 'variant-4']);
    expect(manifest.variants.map((v) => v.status)).toEqual([
      'completed',
      'completed',
      'completed',
      'completed',
      'completed',
    ]);
    const checkpoint = JSON.parse(readFileSync(join(outDir, DEFAULT_CHECKPOINT_FILENAME), 'utf8'));
    expect(checkpoint.completed).toHaveLength(5);
  });

  it('re-renders every variant with resume disabled despite a checkpoint', async () => {
    const dir = makeTempDir();
    dirs.push(dir);
    const input = join(dir, 'rows.json');
    writeFileSync(input, JSON.stringify([{ name: 'a' }, { name: 'b' }]));
    const outDir = join(dir, 'out');

    const first = makeFakeRenderer();
    await runBatch(batchOptions({ input, outDir }), first.render);
    expect(first.state.rendered).toEqual(['variant-0', 'variant-1']);

    const fresh = makeFakeRenderer();
    await runBatch(batchOptions({ input, outDir, resume: false }), fresh.render);
    expect(fresh.state.rendered).toEqual(['variant-0', 'variant-1']);
  });
});

describe('batch CLI command [BF-141][BF-142]', () => {
  const cliBin = resolve('./dist/index.js');

  it('exposes help with input, URL template, and resume options', () => {
    const output = execSync(`node ${cliBin} batch --help`, { encoding: 'utf8' });
    expect(output).toContain('render N variants');
    expect(output).toContain('--url');
    expect(output).toContain('--end');
    expect(output).toContain('--no-resume');
  }, TEST_TIMEOUT);

  it('rejects a batch without the required --end option', () => {
    let error: Error | null = null;
    try {
      execSync(`node ${cliBin} batch rows.json /tmp/out -u 'http://x?n={{name}}'`, { encoding: 'utf8' });
    } catch (err) {
      error = err as Error;
    }
    expect(error).not.toBeNull();
    const stderr = (error as Error & { stderr?: string }).stderr ?? '';
    expect(stderr).toContain('--end');
  }, TEST_TIMEOUT);
});
