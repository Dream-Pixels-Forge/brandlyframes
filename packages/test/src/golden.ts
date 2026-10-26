/**
 * BF-240: golden-frame visual regression runner.
 *
 * Renders designated compositions at pinned frames through an injected
 * capture seam (PNG bytes — the CLI wires the real headless renderer),
 * diffs against golden images, and produces readable text/markdown
 * reports. No browser is launched inside this package.
 *
 * Golden storage convention: goldens live NEXT TO THE COMPOSITION under
 * `__goldens__/<compositionId>/frame-<6-digit-frame>.png`, e.g.
 * `src/__goldens__/Intro/frame-000030.png` — committed to the repo so CI
 * can diff against them.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { decodePng } from './png.js';

/** Captures one frame of a composition as PNG bytes. Renderer seam. */
export type CaptureFn = (options: {
  readonly url: string;
  readonly frame: number;
  readonly width?: number;
  readonly height?: number;
}) => Promise<Uint8Array>;

/** One composition under golden-frame test. */
export interface GoldenTestEntry {
  /** Composition id (also the golden directory name). */
  readonly id: string;
  /** Composition preview URL to capture frames from. */
  readonly url: string;
  /** Pinned frames to render and diff. */
  readonly frames: readonly number[];
  /** Directory containing the composition source (goldens go next to it). */
  readonly dir: string;
  /** Capture width in pixels (default 1920). */
  readonly width?: number;
  /** Capture height in pixels (default 1080). */
  readonly height?: number;
}

/** Options for {@link runGoldenTests}. */
export interface GoldenTestOptions {
  /** Compositions to test. */
  readonly entries: readonly GoldenTestEntry[];
  /** Capture seam — real renderers are wired by the caller (CLI/CI). */
  readonly capture: CaptureFn;
  /** Max per-channel pixel difference for a pixel to match (0–255, default 0). */
  readonly threshold?: number;
  /** Recapture and overwrite goldens instead of diffing. */
  readonly updateGoldens?: boolean;
}

/** Outcome of one frame comparison. */
export type GoldenFrameStatus =
  | 'updated'
  | 'missing-golden'
  | 'pass'
  | 'drift'
  | 'error';

/** Result for one frame of one composition. */
export interface GoldenFrameResult {
  readonly compositionId: string;
  readonly frame: number;
  readonly status: GoldenFrameStatus;
  readonly goldenPath: string;
  /** Number of pixels exceeding the threshold (drift status). */
  readonly diffPixels?: number;
  readonly totalPixels?: number;
  /** Largest per-channel difference seen (drift status). */
  readonly maxChannelDiff?: number;
  /** Error message (error status). */
  readonly error?: string;
}

/** Full golden-frame test report. */
export interface GoldenTestReport {
  readonly passed: boolean;
  readonly threshold: number;
  readonly updateGoldens: boolean;
  readonly results: readonly GoldenFrameResult[];
  readonly counts: Readonly<Record<GoldenFrameStatus, number>>;
}

/**
 * Path of the golden image for one composition frame.
 * Convention: `<dir>/__goldens__/<id>/frame-NNNNNN.png`.
 */
export function goldenFilePath(dir: string, compositionId: string, frame: number): string {
  if (!Number.isInteger(frame) || frame < 0) {
    throw new RangeError(`goldenFilePath: frame must be a non-negative integer, got ${frame}`);
  }
  return join(dir, '__goldens__', compositionId, `frame-${String(frame).padStart(6, '0')}.png`);
}

/** Per-pixel RGBA diff with a per-channel threshold. */
export interface DiffResult {
  passed: boolean;
  diffPixels: number;
  totalPixels: number;
  maxChannelDiff: number;
  threshold: number;
}

/** Size used by the existing stub signature — derived from the decoded data. */
export function goldenFrameDiff(
  actual: Uint8Array,
  expected: Uint8Array,
  threshold = 0,
): DiffResult {
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 255) {
    throw new RangeError(`goldenFrameDiff: threshold must be 0–255, got ${threshold}`);
  }
  const a = decodePng(actual);
  const b = decodePng(expected);
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(
      `goldenFrameDiff: dimension mismatch ${a.width}x${a.height} vs ${b.width}x${b.height}`,
    );
  }
  let diffPixels = 0;
  let maxChannelDiff = 0;
  for (let px = 0; px < a.pixels.length; px += 4) {
    let pixelDiffers = false;
    for (let c = 0; c < 4; c++) {
      const diff = Math.abs(a.pixels[px + c]! - b.pixels[px + c]!);
      if (diff > maxChannelDiff) maxChannelDiff = diff;
      if (diff > threshold) pixelDiffers = true;
    }
    if (pixelDiffers) diffPixels++;
  }
  return {
    passed: diffPixels === 0,
    diffPixels,
    totalPixels: a.width * a.height,
    maxChannelDiff,
    threshold,
  };
}

/** Run golden-frame tests across all entries and frames. */
export async function runGoldenTests(options: GoldenTestOptions): Promise<GoldenTestReport> {
  const threshold = options.threshold ?? 0;
  const results: GoldenFrameResult[] = [];

  for (const entry of options.entries) {
    for (const frame of entry.frames) {
      const goldenPath = goldenFilePath(entry.dir, entry.id, frame);
      try {
        const png = await options.capture({
          url: entry.url,
          frame,
          width: entry.width,
          height: entry.height,
        });

        if (options.updateGoldens) {
          mkdirSync(join(goldenPath, '..'), { recursive: true });
          writeFileSync(goldenPath, png);
          results.push({ compositionId: entry.id, frame, status: 'updated', goldenPath });
          continue;
        }

        let golden: Buffer;
        try {
          golden = readFileSync(goldenPath);
        } catch {
          results.push({
            compositionId: entry.id,
            frame,
            status: 'missing-golden',
            goldenPath,
            error: 'golden image not found — run with --update-goldens to create it',
          });
          continue;
        }

        const diff = goldenFrameDiff(png, golden, threshold);
        results.push({
          compositionId: entry.id,
          frame,
          status: diff.passed ? 'pass' : 'drift',
          goldenPath,
          diffPixels: diff.diffPixels,
          totalPixels: diff.totalPixels,
          maxChannelDiff: diff.maxChannelDiff,
        });
      } catch (error) {
        results.push({
          compositionId: entry.id,
          frame,
          status: 'error',
          goldenPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const counts: Record<GoldenFrameStatus, number> = {
    updated: 0,
    'missing-golden': 0,
    pass: 0,
    drift: 0,
    error: 0,
  };
  for (const r of results) counts[r.status]++;
  const passed =
    options.updateGoldens === true
      ? counts.error === 0
      : counts.drift === 0 && counts.error === 0 && counts['missing-golden'] === 0;

  return { passed, threshold, updateGoldens: options.updateGoldens === true, results, counts };
}

const STATUS_MARK: Record<GoldenFrameStatus, string> = {
  updated: 'UPD',
  'missing-golden': 'MISS',
  pass: 'PASS',
  drift: 'FAIL',
  error: 'ERR',
};

/** Format a report as human-readable text (CLI output). */
export function formatGoldenReport(report: GoldenTestReport): string {
  const lines: string[] = [];
  lines.push('Golden-Frame Test Report');
  lines.push('========================');
  lines.push(
    `Threshold (max per-channel diff): ${report.threshold} | Goldens: ${report.results.length} | Update mode: ${report.updateGoldens}`,
  );
  lines.push('');
  for (const r of report.results) {
    const line =
      `${STATUS_MARK[r.status]} ${r.compositionId} frame ${r.frame}` +
      (r.diffPixels !== undefined
        ? ` — ${r.diffPixels}/${r.totalPixels} px over threshold, max channel diff ${r.maxChannelDiff}`
        : '') +
      (r.error ? ` — ${r.error}` : '');
    lines.push(line);
  }
  lines.push('');
  lines.push(
    `Summary: ${report.counts.pass} pass, ${report.counts.drift} drift, ` +
      `${report.counts['missing-golden']} missing, ${report.counts.error} error, ` +
      `${report.counts.updated} updated`,
  );
  lines.push(report.passed ? 'Result: PASSED' : 'Result: FAILED');
  return lines.join('\n');
}

/** Format a report as markdown (GitHub Action PR comment). */
export function formatGoldenReportMarkdown(report: GoldenTestReport): string {
  const lines: string[] = [];
  const icon = (status: GoldenFrameStatus): string =>
    status === 'pass' || status === 'updated' ? '✅' : '❌';
  lines.push('## BrandlyFrames golden-frame test');
  lines.push('');
  lines.push(
    `**Result: ${report.passed ? 'PASSED' : 'FAILED'}** — threshold ${report.threshold}, ` +
      `${report.counts.pass} pass, ${report.counts.drift} drift, ` +
      `${report.counts['missing-golden']} missing, ${report.counts.error} error, ` +
      `${report.counts.updated} updated`,
  );
  lines.push('');
  lines.push('| Composition | Frame | Status | Diff | Golden |');
  lines.push('|---|---|---|---|---|');
  for (const r of report.results) {
    const diff =
      r.diffPixels !== undefined
        ? `${r.diffPixels}/${r.totalPixels} px (max Δ${r.maxChannelDiff})`
        : (r.error ?? '—');
    lines.push(
      `| ${r.compositionId} | ${r.frame} | ${icon(r.status)} ${r.status} | ${diff} | \`${r.goldenPath}\` |`,
    );
  }
  return lines.join('\n');
}
