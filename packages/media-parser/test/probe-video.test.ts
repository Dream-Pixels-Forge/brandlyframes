import { describe, it, expect } from 'vitest';
import { probeVideo, applyProbedFrameRate } from '../src/index';
import type { VideoMetadata } from '../src/index';

const baseMetadata = (): VideoMetadata => ({
  duration: 2,
  size: { width: 1920, height: 1080 },
  format: 'mp4',
  bitrate: 8000,
  frameRate: 0,
  codec: '',
  pixelFormat: '',
});

describe('probeVideo delegation', () => {
  it('rejects with the browser-environment error in Node', async () => {
    const blob = new Blob(['fake video data'], { type: 'video/mp4' });
    await expect(probeVideo(blob)).rejects.toThrow('Media parser requires a browser environment');
  });
});

describe('applyProbedFrameRate', () => {
  it('sets frameRate from the probed Rational and keeps the Rational exact', () => {
    const out = applyProbedFrameRate(baseMetadata(), { num: 30000, den: 1001 });
    expect(out.frameRateRational).toEqual({ num: 30000, den: 1001 });
    expect(out.frameRate).toBeCloseTo(30000 / 1001, 10);
  });

  it('maps an integer rate exactly', () => {
    const out = applyProbedFrameRate(baseMetadata(), { num: 30, den: 1 });
    expect(out.frameRate).toBe(30);
    expect(out.frameRateRational).toEqual({ num: 30, den: 1 });
  });

  it('preserves every other metadata field', () => {
    const out = applyProbedFrameRate(baseMetadata(), { num: 30, den: 1 });
    expect(out.duration).toBe(2);
    expect(out.size).toEqual({ width: 1920, height: 1080 });
    expect(out.format).toBe('mp4');
    expect(out.bitrate).toBe(8000);
    expect(out.codec).toBe('');
    expect(out.pixelFormat).toBe('');
  });

  it('falls back to frameRate 0 on a degenerate Rational', () => {
    const out = applyProbedFrameRate(baseMetadata(), { num: 30, den: 0 });
    expect(out.frameRate).toBe(0);
  });
});
