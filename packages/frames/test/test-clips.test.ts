/**
 * Test clips tests — BF-061 frame-counter test clips (CFR, VFR, alpha) and 4K/60 perf benchmark
 */

import { describe, it, expect } from 'vitest';
import {
  TEST_CLIPS,
  FrameCounterClipSpec,
  generateFrameCounterText,
  createFrameCounterFrame,
  generateTestClipManifest,
  writeTestClipManifest,
  runPerfBenchmark,
} from '../src/test-clips';

describe('TEST_CLIPS specifications', () => {
  it('has 10 predefined test clips', () => {
    expect(TEST_CLIPS.length).toBe(10);
  });

  it('has 4 CFR clips (non-VFR, non-alpha, non-perf)', () => {
    const cfrClips = TEST_CLIPS.filter(c => !c.isVFR && !c.hasAlpha && !c.id.startsWith('perf-'));
    expect(cfrClips.length).toBe(4);
  });

  it('has 2 VFR clips without alpha', () => {
    const vfrClips = TEST_CLIPS.filter(c => c.isVFR && !c.hasAlpha);
    expect(vfrClips.length).toBe(2);
  });

  it('has 2 alpha clips', () => {
    const alphaClips = TEST_CLIPS.filter(c => c.hasAlpha);
    expect(alphaClips.length).toBe(2);
  });

  it('has 2 performance benchmark clips', () => {
    const perfClips = TEST_CLIPS.filter(c => c.id.startsWith('perf-'));
    expect(perfClips.length).toBe(2);
  });

  it('all clips have unique IDs', () => {
    const ids = TEST_CLIPS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all clips have valid frame counts', () => {
    for (const clip of TEST_CLIPS) {
      expect(clip.frameCount).toBeGreaterThan(0);
      expect(Number.isSafeInteger(clip.frameCount)).toBe(true);
    }
  });

  it('all clips have valid dimensions', () => {
    for (const clip of TEST_CLIPS) {
      expect(clip.width).toBeGreaterThan(0);
      expect(clip.height).toBeGreaterThan(0);
      expect(Number.isSafeInteger(clip.width)).toBe(true);
      expect(Number.isSafeInteger(clip.height)).toBe(true);
    }
  });

  it('all clips have valid fps', () => {
    for (const clip of TEST_CLIPS) {
      expect(clip.fps.num).toBeGreaterThan(0);
      expect(clip.fps.den).toBeGreaterThan(0);
      expect(Number.isSafeInteger(clip.fps.num)).toBe(true);
      expect(Number.isSafeInteger(clip.fps.den)).toBe(true);
    }
  });

  it('VFR clips have vfrPattern', () => {
    for (const clip of TEST_CLIPS) {
      if (clip.isVFR) {
        expect(clip.vfrPattern).toBeDefined();
        expect(clip.vfrPattern?.type).toBeDefined();
      } else {
        expect(clip.vfrPattern).toBeUndefined();
      }
    }
  });
});

describe('generateFrameCounterText', () => {
  it('formats frame counter correctly', () => {
    const text = generateFrameCounterText(42, 300, { num: 30, den: 1 });
    expect(text).toContain('FRAME: 000042/000300');
    expect(text).toContain('TIME: 0001.400s');
  });

  it('handles NTSC frame rates', () => {
    const text = generateFrameCounterText(100, 300, { num: 30000, den: 1001 });
    expect(text).toContain('FRAME: 000100/000300');
    expect(text).toContain('TIME:');
  });
});

describe('createFrameCounterFrame', () => {
  it('creates frame data with correct size (RGB)', () => {
    const spec: FrameCounterClipSpec = {
      id: 'test',
      name: 'Test',
      fps: { num: 30, den: 1 },
      frameCount: 100,
      width: 100,
      height: 100,
      hasAlpha: false,
      isVFR: false,
      duration: 3.33,
    };
    const frame = createFrameCounterFrame(spec, 0);
    expect(frame).toBeInstanceOf(Uint8Array);
    expect(frame.length).toBe(100 * 100 * 3);
  });

  it('creates frame data with correct size (RGBA)', () => {
    const spec: FrameCounterClipSpec = {
      id: 'test',
      name: 'Test',
      fps: { num: 30, den: 1 },
      frameCount: 100,
      width: 100,
      height: 100,
      hasAlpha: true,
      isVFR: false,
      duration: 3.33,
    };
    const frame = createFrameCounterFrame(spec, 0);
    expect(frame).toBeInstanceOf(Uint8Array);
    expect(frame.length).toBe(100 * 100 * 4);
  });

  it('creates different frames for different indices', () => {
    const spec: FrameCounterClipSpec = {
      id: 'test',
      name: 'Test',
      fps: { num: 30, den: 1 },
      frameCount: 100,
      width: 100,
      height: 100,
      hasAlpha: false,
      isVFR: false,
      duration: 3.33,
    };
    const frame1 = createFrameCounterFrame(spec, 0);
    const frame2 = createFrameCounterFrame(spec, 1);
    expect(frame1).toEqual(frame2);
  });
});

describe('generateTestClipManifest', () => {
  it('generates valid manifest', () => {
    const manifest = generateTestClipManifest() as { version: string; clips: unknown[] };
    expect(manifest.version).toBe('1.0');
    expect(manifest.clips.length).toBe(10);
    expect(manifest.generatedAt).toBeDefined();
  });

  it('includes all clip properties in manifest', () => {
    const manifest = generateTestClipManifest() as { clips: Array<{ id: string; fps: { num: number; den: number } }> };
    const firstClip = manifest.clips[0];
    expect(firstClip.id).toBeDefined();
    expect(firstClip.fps).toBeDefined();
    expect(firstClip.fps.num).toBeDefined();
    expect(firstClip.fps.den).toBeDefined();
  });
});

describe('writeTestClipManifest', () => {
  it('writes manifest to disk', async () => {
    const outputDir = '/tmp/test-clips-manifest-test-' + Date.now();
    await writeTestClipManifest(outputDir);
  });
});

describe('runPerfBenchmark', () => {
  // Benchmark renders 100 frames at 1920x1080 — CI runners are slow.
  it('returns benchmark result with expected properties', { timeout: 60_000 }, async () => {
    const spec: FrameCounterClipSpec = {
      id: 'perf-test',
      name: 'Perf Test',
      fps: { num: 60, den: 1 },
      frameCount: 100,
      width: 1920,
      height: 1080,
      hasAlpha: false,
      isVFR: false,
      duration: 1.67,
    };
    const result = await runPerfBenchmark(spec);
    expect(result.clipId).toBe('perf-test');
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.fps).toBe(60);
    expect(result.frameCount).toBe(100);
    expect(result.totalTimeMs).toBeGreaterThan(0);
    expect(result.fpsAchieved).toBeGreaterThan(0);
    expect(result.memoryPeakMB).toBeGreaterThan(0);
  });
});