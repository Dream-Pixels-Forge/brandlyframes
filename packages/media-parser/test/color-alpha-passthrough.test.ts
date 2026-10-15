import { describe, it, expect } from 'vitest';
import { applyProbedVideoDetails } from '../src/index';
import type { VideoMetadata, VideoProbeResult } from '../src/index';

const baseMetadata = (): VideoMetadata => ({
  duration: 2,
  size: { width: 1920, height: 1080 },
  format: 'mp4',
  bitrate: 8000,
  frameRate: 30,
  codec: 'avc1.42E01E',
  pixelFormat: 'yuv420p',
});

const baseProbe = (): VideoProbeResult => ({
  fps: { num: 30, den: 1 },
  frameCount: 60,
  colorSpace: 'display-p3',
  hasAlpha: true,
  alphaMode: 'straight',
  isVFR: false,
  codec: 'ap4h',
  width: 1920,
  height: 1080,
  duration: 2,
});

describe('applyProbedVideoDetails color/alpha passthrough [BF-057]', () => {
  it('passes colorSpace, hasAlpha, and alphaMode from the probe into video metadata', () => {
    const out = applyProbedVideoDetails(baseMetadata(), baseProbe());
    expect(out.colorSpace).toBe('display-p3');
    expect(out.hasAlpha).toBe(true);
    expect(out.alphaMode).toBe('straight');
  });

  it('defaults alphaMode to null when the probe carries none', () => {
    const probe = baseProbe();
    delete probe.alphaMode;
    const out = applyProbedVideoDetails(baseMetadata(), probe);
    expect(out.hasAlpha).toBe(true);
    expect(out.alphaMode).toBeNull();
  });

  it('normalizes an unrecognized probe colorSpace to unknown', () => {
    const out = applyProbedVideoDetails(baseMetadata(), { ...baseProbe(), colorSpace: 'garbage' });
    expect(out.colorSpace).toBe('unknown');
  });

  it('preserves every other metadata field and never mutates its input', () => {
    const base = baseMetadata();
    const snapshot = { ...base, size: { ...base.size } };
    const out = applyProbedVideoDetails(base, baseProbe());
    expect(out.duration).toBe(2);
    expect(out.size).toEqual({ width: 1920, height: 1080 });
    expect(out.format).toBe('mp4');
    expect(out.frameRate).toBe(30);
    expect(out.codec).toBe('avc1.42E01E');
    expect(out.pixelFormat).toBe('yuv420p');
    expect(base).toEqual(snapshot);
  });

  it('keeps existing contracts working when the optional fields are absent', () => {
    const bare: VideoMetadata = {
      duration: 1,
      size: { width: 640, height: 480 },
      format: 'webm',
      bitrate: 1000,
      frameRate: 24,
      codec: '',
      pixelFormat: '',
    };
    expect(bare.colorSpace).toBeUndefined();
    expect(bare.hasAlpha).toBeUndefined();
    expect(bare.alphaMode).toBeUndefined();
  });
});
