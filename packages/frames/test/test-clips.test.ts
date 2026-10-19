import { describe, it, expect, vi } from 'vitest';
import {
  TEST_CLIPS,
  generateFrameCounterText,
  createFrameCounterFrame,
  generateTestClipManifest,
  runPerfBenchmark,
} from '../src/index';

describe('TEST_CLIPS (BF-061)', () => {
  it('exposes predefined clip specs', () => {
    expect(Array.isArray(TEST_CLIPS)).toBe(true);
    expect(TEST_CLIPS.length).toBeGreaterThan(0);
  });

  it('includes CFR clips', () => {
    const cfrClips = TEST_CLIPS.filter((c) => !c.isVFR && !c.hasAlpha);
    expect(cfrClips.length).toBeGreaterThan(0);
    for (const c of cfrClips) {
      expect(c.fps.num).toBeGreaterThan(0);
      expect(c.fps.den).toBeGreaterThan(0);
      expect(c.frameCount).toBeGreaterThan(0);
    }
  });

  it('includes VFR clips', () => {
    const vfrClips = TEST_CLIPS.filter((c) => c.isVFR);
    expect(vfrClips.length).toBeGreaterThan(0);
    for (const c of vfrClips) {
      expect(c.vfrPattern).toBeDefined();
      expect(c.vfrPattern!.type).toBeDefined();
    }
  });

  it('includes alpha channel clips', () => {
    const alphaClips = TEST_CLIPS.filter((c) => c.hasAlpha);
    expect(alphaClips.length).toBeGreaterThan(0);
    for (const c of alphaClips) {
      expect(c.hasAlpha).toBe(true);
    }
  });

  it('includes a 4K/60 perf benchmark clip', () => {
    const perf4k = TEST_CLIPS.find((c) => c.id === 'perf-4k-60fps-full');
    expect(perf4k).toBeDefined();
    expect(perf4k!.width).toBe(3840);
    expect(perf4k!.height).toBe(2160);
    expect(perf4k!.fps.num / perf4k!.fps.den).toBe(60);
  });
});

describe('generateFrameCounterText (BF-061)', () => {
  it('pads frame index to 6 digits', () => {
    const text = generateFrameCounterText(5, 300, { num: 30, den: 1 });
    expect(text).toContain('FRAME: 000005/000300');
  });

  it('formats elapsed time', () => {
    const text = generateFrameCounterText(60, 300, { num: 30, den: 1 });
    expect(text).toContain('TIME:');
  });

  it('handles NTSC fractional rate', () => {
    const text = generateFrameCounterText(100, 300, { num: 30000, den: 1001 });
    expect(text).toContain('TIME:');
    expect(text.length).toBeGreaterThan(0);
  });
});

describe('createFrameCounterFrame (BF-061)', () => {
  it('generates RGB frame with correct dimensions', () => {
    const spec = TEST_CLIPS[0];
    const frame = createFrameCounterFrame(spec, 0);
    expect(frame.length).toBe(spec.width * spec.height * 3);
  });

  it('generates RGBA frame when hasAlpha is true', () => {
    const spec = TEST_CLIPS.find((c) => c.hasAlpha)!;
    const frame = createFrameCounterFrame(spec, 0);
    expect(frame.length).toBe(spec.width * spec.height * 4);
  });

  it('is deterministic for same frame index', () => {
    const spec = {
      id: 'tiny',
      name: 'Tiny',
      fps: { num: 30, den: 1 },
      frameCount: 5,
      width: 64,
      height: 48,
      hasAlpha: false,
      isVFR: false,
      duration: 1,
    };
    const a = createFrameCounterFrame(spec, 42);
    const b = createFrameCounterFrame(spec, 42);
    expect(a).toEqual(b);
  });
});

describe('generateTestClipManifest (BF-061)', () => {
  it('generates manifest with clip metadata', () => {
    const manifest = generateTestClipManifest();
    expect(manifest.version).toBe('1.0');
    expect(manifest.clips.length).toBe(TEST_CLIPS.length);
    for (const clip of manifest.clips) {
      expect(clip.id).toBeDefined();
      expect(clip.name).toBeDefined();
      expect(clip.width).toBeDefined();
      expect(clip.height).toBeDefined();
    }
  });
});

describe('runPerfBenchmark (BF-061)', () => {
  it('returns a valid perf result for a small clip', async () => {
    const spec = {
      id: 'perf-test-mini',
      name: 'Perf Test Mini',
      fps: { num: 30, den: 1 },
      frameCount: 10,
      width: 1920,
      height: 1080,
      hasAlpha: false,
      isVFR: false,
      duration: 1,
    };

    const result = await runPerfBenchmark(spec);
    expect(result.clipId).toBe('perf-test-mini');
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.fps).toBe(30);
    expect(result.frameCount).toBe(10);
    expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.fpsAchieved).toBeGreaterThan(0);
    expect(result.memoryPeakMB).toBeGreaterThan(0);
  });
});
