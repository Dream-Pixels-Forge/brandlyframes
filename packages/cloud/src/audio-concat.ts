/**
 * Artifact-free audio concat (BF-472).
 *
 * Chunks are rendered with their audio separately; this module concatenates
 * them WITHOUT re-encoding (FFmpeg concat demuxer + stream copy, exact
 * frame-mapped durations so chunk boundaries never click), and provides the
 * mocked-clock A/V drift harness that replays a synthetic 10-minute timeline
 * (18000 frames @ 30 fps) through pure computation — no real render.
 *
 * The spawn step is injectable ({@link SpawnFn} from the renderer package),
 * mirroring the renderer's mix/stitch pattern, so tests never execute FFmpeg.
 * Clean-room implementation.
 */

import { spawn as spawnChild } from 'node:child_process';
import {
  FFmpegNotFoundError,
  type SpawnFn,
} from '@brandlyframes/renderer';
import type { DriftCheckResult } from './index';

/** Default fps for frame→seconds mapping (matches the renderer mixer). */
const DEFAULT_CONCAT_FPS = 30;

/** One audio chunk in the concat sequence. */
export interface AudioConcatSegment {
  /** Path/URL of the chunk's audio stream (same codec/layout across chunks). */
  readonly src: string;
  /** First composition frame covered by this chunk. */
  readonly startFrame: number;
  /** Number of composition frames in this chunk (>= 1). */
  readonly frameCount: number;
}

/** Options for {@link buildAudioConcatList}. */
export interface AudioConcatListOptions {
  /** Composition fps used to map frames to seconds (default 30). */
  readonly fps?: number;
}

/** Builds an FFmpeg concat-demuxer list with exact per-segment durations. */
export function buildAudioConcatList(
  segments: readonly AudioConcatSegment[],
  options: AudioConcatListOptions = {}
): string {
  if (segments.length === 0) {
    throw new RangeError('buildAudioConcatList: segments must not be empty');
  }
  const fps = options.fps ?? DEFAULT_CONCAT_FPS;
  const lines: string[] = [];
  for (const segment of segments) {
    if (segment.frameCount < 1) {
      throw new RangeError(
        `buildAudioConcatList: segment ${segment.src} frameCount must be >= 1, got ${segment.frameCount}`
      );
    }
    lines.push(`file '${segment.src}'`);
    // Exact frame-mapped duration: the demuxer cuts at the outpoint, so a
    // chunk boundary lands on the sample grid — no click, no re-encode.
    lines.push(`duration ${segment.frameCount / fps}`);
  }
  // Concat demuxer quirk: repeat the last file so its duration is honoured.
  lines.push(`file '${segments[segments.length - 1]!.src}'`);
  return lines.join('\n');
}

/**
 * FFmpeg argv that concatenates audio with stream copy — no re-encoding.
 * `-copyts` preserves original timestamps so boundaries stay sample-exact.
 */
export function buildAudioConcatArgs(
  listPath: string,
  output: string
): readonly string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
    '-c:a',
    'copy',
    '-copyts',
    '-y',
    output,
  ];
}

/** Options for {@link concatAudioStreams}. */
export interface AudioConcatStreamOptions {
  /** Where the list file lives (caller-owned temp path — the caller writes
   * {@link buildAudioConcatList} output there before calling). */
  readonly listPath: string;
  /** Output path for the concatenated audio. */
  readonly output: string;
  /** Segments (validated before spawn). */
  readonly segments: readonly AudioConcatSegment[];
  /** fps for validation only (default 30). */
  readonly fps?: number;
  /**
   * Spawn override for tests; defaults to `child_process.spawn`. The caller
   * owns writing the list file — this module only validates and orchestrates
   * FFmpeg, staying side-effect-free apart from the FFmpeg call.
   */
  readonly spawnFn?: SpawnFn;
}

/** Result of {@link concatAudioStreams}. */
export interface AudioConcatResult {
  /** Output path passed through. */
  readonly outputPath: string;
  /** Whether this call wrote the list file itself (always false — caller-owned). */
  readonly wroteList: boolean;
  /** Number of segments concatenated. */
  readonly segmentCount: number;
}

/**
 * Concatenates the chunk audio streams via FFmpeg with stream copy. The
 * spawn is injectable; no list file is written here (caller-owned temp
 * path), keeping the module side-effect-free apart from the FFmpeg call.
 */
export async function concatAudioStreams(
  options: AudioConcatStreamOptions
): Promise<AudioConcatResult> {
  // Validates segments (non-empty, frameCount >= 1) before any spawn.
  buildAudioConcatList(options.segments, { fps: options.fps });
  const spawnFn: SpawnFn =
    options.spawnFn ??
    ((command, args) => spawnChild(command, args));
  return new Promise<AudioConcatResult>((resolve, reject) => {
    const child = spawnFn('ffmpeg', buildAudioConcatArgs(options.listPath, options.output));
    let stderr = '';
    child.stderr.on('data', (chunk: Uint8Array) => {
      stderr += new TextDecoder().decode(chunk);
    });
    child.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        reject(new FFmpegNotFoundError());
        return;
      }
      reject(error);
    });
    child.on('close', (code: number | null) => {
      if (code === 0) {
        resolve({
          outputPath: options.output,
          wroteList: false,
          segmentCount: options.segments.length,
        });
      } else {
        reject(new Error(`ffmpeg concat exited with code ${code}: ${stderr.trim()}`));
      }
    });
  });
}

// ============================================================================
// Mocked-clock A/V drift harness (BF-472)
// ============================================================================

/** Synthetic 10-minute timeline: 18000 frames at 30 fps = 600 s. */
export const SYNTHETIC_DRIFT_TIMELINE = {
  fps: 30,
  totalFrames: 18000,
  chunkSize: 300,
} as const;

/** Options for {@link createMockClock}. */
export interface MockClockOptions {
  /** Nominal milliseconds per frame (default 1000/30). */
  readonly frameDurationMs?: number;
  /** Extra milliseconds added per frame index (accumulates). */
  readonly driftPerFrameMs?: number;
  /** Extra milliseconds added at each chunk boundary (frame % chunkSize === 0). */
  readonly driftPerChunkMs?: number;
  /** Frames per chunk for boundary detection (default 300). */
  readonly chunkSize?: number;
}

/**
 * Builds a deterministic mocked clock mapping frame → actual timestamp (ms).
 * The frame is the clock: actual(frame) = frame * frameDurationMs +
 * frame * driftPerFrameMs + floor(frame / chunkSize) * driftPerChunkMs.
 */
export function createMockClock(options: MockClockOptions = {}): (frame: number) => number {
  const frameDurationMs = options.frameDurationMs ?? 1000 / (SYNTHETIC_DRIFT_TIMELINE.fps);
  const driftPerFrameMs = options.driftPerFrameMs ?? 0;
  const driftPerChunkMs = options.driftPerChunkMs ?? 0;
  const chunkSize = options.chunkSize ?? SYNTHETIC_DRIFT_TIMELINE.chunkSize;
  return (frame: number) =>
    frame * frameDurationMs +
    frame * driftPerFrameMs +
    Math.floor(frame / chunkSize) * driftPerChunkMs;
}

/** Options for {@link runAudioDriftHarness}. */
export interface AudioDriftHarnessOptions extends MockClockOptions {
  /** Frames per chunk on the synthetic timeline (default 300). */
  readonly chunkSize?: number;
  /** Total frames of the synthetic timeline (default 18000 = 10 min). */
  readonly totalFrames?: number;
  /** fps of the synthetic timeline (default 30). */
  readonly fps?: number;
  /** Allowed drift in ms before a boundary counts as drifted (default 33 ≈ 1 frame). */
  readonly toleranceMs?: number;
}

/**
 * Replays the synthetic timeline through the mocked clock and measures A/V
 * drift at every chunk boundary: expected video position is
 * `frame / fps * 1000`; the audio position is whatever the (mocked) render
 * clock produced. Pure computation — no real render, no waiting.
 */
export function runAudioDriftHarness(
  options: AudioDriftHarnessOptions = {}
): DriftCheckResult {
  const fps = options.fps ?? SYNTHETIC_DRIFT_TIMELINE.fps;
  const totalFrames = options.totalFrames ?? SYNTHETIC_DRIFT_TIMELINE.totalFrames;
  const chunkSize = options.chunkSize ?? SYNTHETIC_DRIFT_TIMELINE.chunkSize;
  const toleranceMs = options.toleranceMs ?? 33;
  if (fps <= 0 || !Number.isFinite(fps)) {
    throw new RangeError(`runAudioDriftHarness: fps must be > 0, got ${fps}`);
  }
  if (chunkSize < 1 || totalFrames < chunkSize) {
    throw new RangeError(
      `runAudioDriftHarness: need totalFrames (${totalFrames}) >= chunkSize (${chunkSize}) >= 1`
    );
  }

  const clock = createMockClock(options);
  const comparisons: DriftCheckResult['comparisons'] = [];
  const driftedFrames: number[] = [];
  let maxDriftMs = 0;

  // Probe every chunk boundary plus the final frame of the timeline. The
  // expected position is computed the same way the mocked clock computes its
  // base term (frame * 1000/fps), so a perfectly timed timeline is exactly
  // drift-free — the comparison only measures injected drift.
  for (let frame = chunkSize; frame <= totalFrames; frame += chunkSize) {
    const expectedMs = frame * (1000 / fps);
    const actualMs = clock(frame);
    const driftMs = actualMs - expectedMs;
    comparisons.push({ frame, expectedMs, actualMs, driftMs });
    if (Math.abs(driftMs) > Math.abs(maxDriftMs)) {
      maxDriftMs = driftMs;
    }
    if (Math.abs(driftMs) > toleranceMs) {
      driftedFrames.push(frame);
    }
  }

  return {
    hasDrift: driftedFrames.length > 0,
    maxDriftMs,
    driftedFrames,
    comparisons,
  };
}
