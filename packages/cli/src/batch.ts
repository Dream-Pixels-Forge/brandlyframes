/**
 * Batch rendering [BF-141][BF-142].
 *
 * `runBatch` renders N variants from CSV/JSON/API input: every row's props
 * are substituted into a URL template (`{{column}}` placeholders) and one
 * render job runs per variant. Two artifacts keep batches observable and
 * resumable:
 *
 * - **Batch manifest** [BF-141]: `<outDir>/batch-manifest.json` records every
 *   variant with its props, rendered URL, output dir and status — written
 *   before the first render and updated after each one.
 * - **Checkpoint** [BF-142]: `<outDir>/batch-checkpoint.json` records the ids
 *   of completed variants, updated after each completion. A rerun of the same
 *   command skips completed variants, so a 500-variant batch that crashes
 *   halfway resumes with only the unfinished tail.
 *
 * The renderer is injected (`BatchRendererFn`) so tests drive the whole
 * orchestration with fakes — no Chrome. The CLI wires the real renderer
 * (`runRenderJob` + CDP launcher).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

/** Batch manifest file name created inside `outDir` unless overridden. */
export const DEFAULT_MANIFEST_FILENAME = 'batch-manifest.json';

/** Checkpoint file name created inside `outDir` unless overridden. */
export const DEFAULT_CHECKPOINT_FILENAME = 'batch-checkpoint.json';

/** Current batch manifest schema version. */
export const BATCH_MANIFEST_VERSION = 1;

/** One unit of work in a batch: an input row resolved to a render. */
export interface BatchVariant {
  /** Stable id (`variant-<row index>`) used by the checkpoint. */
  readonly id: string;
  /** Row index in input order (0-based). */
  readonly index: number;
  /** Row props after input parsing (all strings). */
  readonly props: Readonly<Record<string, string>>;
  /** URL template with `{{column}}` placeholders substituted. */
  readonly url: string;
  /** Per-variant render output directory. */
  readonly outDir: string;
  /** Lifecycle status — `pending` until first run, then completed/failed. */
  status: 'pending' | 'completed' | 'failed';
  /** Renderer error message when status is `failed`. */
  error?: string;
}

/** Persisted batch state: every variant with its current status [BF-141]. */
export interface BatchManifest {
  /** Manifest schema version ({@link BATCH_MANIFEST_VERSION}). */
  readonly version: number;
  /** Batch input as given to the CLI (file path or API URL). */
  readonly input: string;
  /** URL template the variant URLs were rendered from. */
  readonly urlTemplate: string;
  /** First frame per variant (inclusive). */
  readonly start: number;
  /** One past the last frame per variant (exclusive). */
  readonly end: number;
  /** Total number of variants (= input rows). */
  readonly total: number;
  readonly createdAt: string;
  /** Refreshed on every manifest write. */
  updatedAt: string;
  readonly variants: readonly BatchVariant[];
}

/** Persisted record of completed variant ids [BF-142]. */
export interface BatchCheckpoint {
  readonly completed: readonly string[];
}

/** Options for {@link runBatch}. */
export interface BatchOptions {
  /** Batch input: `.csv` file, `.json` file (array of row objects), or http(s) API URL returning that JSON. */
  input: string;
  /** URL template with `{{column}}` placeholders substituted per row. */
  urlTemplate: string;
  /** Output root; per-variant renders go to `<outDir>/variant-<index>`. */
  outDir: string;
  /** One past the last frame per variant (exclusive). */
  end: number;
  /** First frame per variant (default 0). */
  start?: number;
  /** Batch manifest path (default: `<outDir>/batch-manifest.json`). */
  manifestPath?: string;
  /** Checkpoint path (default: `<outDir>/batch-checkpoint.json`). */
  checkpointPath?: string;
  /** Resume from the checkpoint, skipping completed variants (default `true`) [BF-142]. */
  resume?: boolean;
  /** Called after each attempted variant (completed or failed). */
  onVariantDone?: (variant: BatchVariant) => void;
}

/** Renders one variant to `variant.outDir`. Throws to mark the variant failed. */
export type BatchRendererFn = (variant: BatchVariant) => Promise<void>;

/** Substitutes `{{column}}` placeholders with row props. Throws on missing props. */
export const applyTemplate = (template: string, props: Readonly<Record<string, string>>): string =>
  template.replace(/\{\{([^{}]+)\}\}/g, (_match, rawKey: string) => {
    const key = rawKey.trim();
    if (!(key in props)) {
      throw new Error(`template references missing prop "${key}"`);
    }
    return props[key];
  });

/**
 * Parses CSV text into rows of fields (RFC 4180: quoted fields, escaped
 * quotes, embedded commas/newlines). Header-less raw rows — see
 * {@link csvRowsToObjects}.
 */
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop blank lines (e.g. trailing newline).
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
};

const coerceCell = (value: unknown): string => (value == null ? '' : String(value));

/** Turns raw CSV rows (first row = header) into prop objects. */
const csvRowsToObjects = (rows: readonly string[][]): Record<string, string>[] => {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] ?? '';
    });
    return row;
  });
};

const jsonRowsToObjects = (text: string): Record<string, string>[] => {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.some((row) => typeof row !== 'object' || row === null)) {
    throw new Error('batch input JSON must be an array of row objects');
  }
  return (parsed as Record<string, unknown>[]).map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, coerceCell(value)]))
  );
};

/**
 * Loads batch rows [BF-141]: `.csv` files parse as CSV (first row = header),
 * other files parse as a JSON array of row objects, and http(s) URLs fetch
 * JSON from an API. All values are coerced to strings.
 */
export const loadBatchInput = async (input: string): Promise<Record<string, string>[]> => {
  let text: string;
  if (/^https?:\/\//.test(input)) {
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`batch input fetch failed: ${input} (${response.status})`);
    }
    text = await response.text();
  } else {
    text = await readFile(input, 'utf8');
  }
  return input.toLowerCase().endsWith('.csv')
    ? csvRowsToObjects(parseCsv(text))
    : jsonRowsToObjects(text);
};

const readCheckpoint = async (checkpointPath: string): Promise<Set<string>> => {
  const completed = new Set<string>();
  let raw: string | null = null;
  try {
    raw = await readFile(checkpointPath, 'utf8');
  } catch {
    return completed; // no checkpoint yet — fresh batch
  }
  try {
    const parsed = JSON.parse(raw) as BatchCheckpoint;
    if (Array.isArray(parsed.completed)) {
      for (const id of parsed.completed) completed.add(id);
    }
  } catch {
    // Malformed checkpoint starts a fresh batch (same policy as render manifests).
  }
  return completed;
};

/**
 * Runs a batch [BF-141][BF-142]: loads input rows, renders every variant
 * through `renderer`, records progress in the manifest after each variant
 * and in the checkpoint after each completion. Completed variants are skipped
 * when resuming; failed ones are recorded and retried on the next run.
 * Rejects with a failure summary when any variant failed.
 */
export const runBatch = async (options: BatchOptions, renderer: BatchRendererFn): Promise<BatchManifest> => {
  const rows = await loadBatchInput(options.input);
  if (rows.length === 0) {
    throw new Error(`batch: no input rows found in ${options.input}`);
  }
  const outDir = resolve(options.outDir);
  const start = options.start ?? 0;
  const manifestPath = options.manifestPath ?? join(outDir, DEFAULT_MANIFEST_FILENAME);
  const checkpointPath = options.checkpointPath ?? join(outDir, DEFAULT_CHECKPOINT_FILENAME);

  const variants: BatchVariant[] = rows.map((props, index) => ({
    id: `variant-${index}`,
    index,
    props,
    url: applyTemplate(options.urlTemplate, props),
    outDir: join(outDir, `variant-${index}`),
    status: 'pending',
  }));

  // Resume [BF-142]: checkpoint lists completed ids; reruns skip them.
  const completed = options.resume === false ? new Set<string>() : await readCheckpoint(checkpointPath);
  for (const variant of variants) {
    if (completed.has(variant.id)) variant.status = 'completed';
  }

  const manifest: BatchManifest = {
    version: BATCH_MANIFEST_VERSION,
    input: options.input,
    urlTemplate: options.urlTemplate,
    start,
    end: options.end,
    total: variants.length,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    variants,
  };
  const writeManifest = async () => {
    manifest.updatedAt = new Date().toISOString();
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  };
  const writeCheckpoint = async () => {
    await mkdir(dirname(checkpointPath), { recursive: true });
    await writeFile(checkpointPath, JSON.stringify({ completed: [...completed] } satisfies BatchCheckpoint, null, 2));
  };
  await writeManifest();

  let failed = 0;
  for (const variant of variants) {
    if (variant.status === 'completed') continue;
    let renderError: unknown = null;
    try {
      await renderer(variant);
    } catch (error) {
      renderError = error;
    }
    if (renderError === null) {
      variant.status = 'completed';
      completed.add(variant.id);
      await writeCheckpoint();
    } else {
      variant.status = 'failed';
      variant.error = renderError instanceof Error ? renderError.message : String(renderError);
      failed += 1;
    }
    options.onVariantDone?.(variant);
    await writeManifest();
  }

  if (failed > 0) {
    throw new Error(`batch: ${failed} of ${variants.length} variant(s) failed — rerun the same command to resume [BF-142]`);
  }
  return manifest;
};
