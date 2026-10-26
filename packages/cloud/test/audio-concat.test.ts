/**
 * Artifact-free audio concat (BF-472): stream-copy concat args (no
 * re-encoding), exact frame-mapped segment boundaries, and a mocked-clock
 * A/V drift harness on a synthetic 10-minute timeline. No real FFmpeg, no
 * real render — fully deterministic.
 */

import { describe, expect, it } from 'vitest';
import type { SpawnFn } from '@brandlyframes/renderer';
import {
  buildAudioConcatArgs,
  buildAudioConcatList,
  concatAudioStreams,
  createMockClock,
  runAudioDriftHarness,
  SYNTHETIC_DRIFT_TIMELINE,
  type AudioConcatSegment,
} from '../src/audio-concat';

const TEN_MIN_SEGMENTS: AudioConcatSegment[] = Array.from({ length: 60 }, (_, i) => ({
  src: `/tmp/chunk-${i}.wav`,
  startFrame: i * 300,
  frameCount: 300,
}));

describe('buildAudioConcatList (BF-472)', () => {
  it('emits one file + duration pair per segment', () => {
    const list = buildAudioConcatList(TEN_MIN_SEGMENTS.slice(0, 2), { fps: 30 });
    expect(list).toContain("file '/tmp/chunk-0.wav'");
    expect(list).toContain('duration 10');
    expect(list).toContain("file '/tmp/chunk-1.wav'");
  });

  it('maps frames to seconds via fps (frame-accurate outpoints)', () => {
    const list = buildAudioConcatList(
      [{ src: 'a.wav', startFrame: 0, frameCount: 45 }],
      { fps: 30 }
    );
    expect(list).toContain('duration 1.5');
  });

  it('rejects empty segment lists', () => {
    expect(() => buildAudioConcatList([], { fps: 30 })).toThrow(RangeError);
  });
});

describe('buildAudioConcatArgs (BF-472)', () => {
  it('uses the concat demuxer with stream copy — no re-encoding', () => {
    const args = buildAudioConcatArgs('/tmp/list.txt', '/tmp/out.m4a');
    const joined = args.join(' ');
    expect(joined).toContain('-f concat');
    expect(joined).toContain('-c:a copy');
    // The audio stream must never be re-encoded.
    expect(joined).not.toContain('aac');
    expect(joined).not.toContain('libmp3');
    expect(joined).not.toContain('-c:a aac');
  });

  it('keeps the original timestamps so boundaries do not click', () => {
    const args = buildAudioConcatArgs('/tmp/list.txt', '/tmp/out.m4a');
    expect(args).toContain('-copyts');
  });
});

describe('concatAudioStreams (BF-472)', () => {
  it('spawns ffmpeg with the stream-copy args via the injectable transport', async () => {
    const calls: Array<{ command: string; args: readonly string[] }> = [];
    const result = await concatAudioStreams({
      listPath: '/tmp/list.txt',
      output: '/tmp/out.m4a',
      segments: TEN_MIN_SEGMENTS.slice(0, 2),
      spawnFn: ((command: string, args: readonly string[]) => {
        calls.push({ command, args });
        return {
          stdout: { on: () => undefined },
          stderr: { on: () => undefined },
          on: (event: string, cb: (code?: number | null) => void) => {
            if (event === 'close') cb(0); // simulate successful ffmpeg exit
          },
        };
      }) as unknown as SpawnFn,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.command).toBe('ffmpeg');
    expect(calls[0]!.args).toContain('-c:a');
    expect(calls[0]!.args).toContain('copy');
    expect(result.outputPath).toBe('/tmp/out.m4a');
    expect(result.wroteList).toBe(false);
  });
});

describe('createMockClock (BF-472)', () => {
  it('produces a deterministic mocked clock', () => {
    const clock = createMockClock({ frameDurationMs: 1000 / 30 });
    expect(clock(0)).toBe(0);
    expect(clock(30)).toBeCloseTo(1000, 6);
    expect(clock(60)).toBeCloseTo(2000, 6);
    // Deterministic: same frame, same time.
    expect(clock(30)).toBe(clock(30));
  });
});

describe('runAudioDriftHarness (BF-472)', () => {
  it('synthetic defaults describe a 10-minute timeline (18000 frames @ 30fps)', () => {
    expect(SYNTHETIC_DRIFT_TIMELINE.totalFrames).toBe(18000);
    expect(SYNTHETIC_DRIFT_TIMELINE.fps).toBe(30);
    expect(SYNTHETIC_DRIFT_TIMELINE.totalFrames / SYNTHETIC_DRIFT_TIMELINE.fps).toBe(600);
  });

  it('reports no drift on a perfectly timed synthetic timeline', () => {
    const result = runAudioDriftHarness({});
    expect(result.hasDrift).toBe(false);
    expect(result.maxDriftMs).toBe(0);
    expect(result.driftedFrames).toHaveLength(0);
    // 60 chunk boundaries checked across the synthetic 10 minutes.
    expect(result.comparisons.length).toBe(60);
  });

  it('detects per-chunk drift injected by the mocked clock', () => {
    const result = runAudioDriftHarness({ driftPerChunkMs: 5, toleranceMs: 2 });
    expect(result.hasDrift).toBe(true);
    expect(result.maxDriftMs).toBeGreaterThanOrEqual(5 * 59);
    expect(result.driftedFrames.length).toBeGreaterThan(0);
  });

  it('detects accumulated per-frame drift at chunk boundaries', () => {
    // 0.5ms extra per frame → 150ms extra per 300-frame chunk.
    const result = runAudioDriftHarness({ driftPerFrameMs: 0.5, toleranceMs: 10 });
    expect(result.hasDrift).toBe(true);
    expect(result.maxDriftMs).toBeGreaterThanOrEqual(100);
  });

  it('stays within tolerance when drift is small', () => {
    const result = runAudioDriftHarness({ driftPerChunkMs: 1, toleranceMs: 200 });
    expect(result.hasDrift).toBe(false);
  });

  it('never renders or waits real time — pure computation', () => {
    const start = process.hrtime.bigint();
    runAudioDriftHarness({});
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    expect(elapsedMs).toBeLessThan(500);
  });
});
