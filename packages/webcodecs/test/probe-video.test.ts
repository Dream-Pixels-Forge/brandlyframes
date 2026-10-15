import { describe, it, expect } from 'vitest';
import { reduceRational, probeVideoFallback, probeVideo } from '../src/probe-video';
import type { ProbeableVideoElement } from '../src/probe-video';

/** Build a mock element satisfying the minimal structural probe interface. */
const mockElement = (overrides: Partial<ProbeableVideoElement> = {}): ProbeableVideoElement => ({
  duration: 2,
  videoWidth: 1920,
  videoHeight: 1080,
  ...overrides,
});

describe('reduceRational', () => {
  it('keeps an already-reduced NTSC rate exact', () => {
    expect(reduceRational(30000, 1001)).toEqual({ num: 30000, den: 1001 });
  });

  it('reduces 60000/2002 to 30000/1001 via gcd', () => {
    expect(reduceRational(60000, 2002)).toEqual({ num: 30000, den: 1001 });
  });

  it('falls back to 30/1 on 0/0', () => {
    expect(reduceRational(0, 0)).toEqual({ num: 30, den: 1 });
  });

  it('falls back to 30/1 on negative inputs', () => {
    expect(reduceRational(-30, 1)).toEqual({ num: 30, den: 1 });
    expect(reduceRational(30, -1)).toEqual({ num: 30, den: 1 });
  });

  it('falls back to 30/1 on non-integer inputs', () => {
    expect(reduceRational(29.97, 1)).toEqual({ num: 30, den: 1 });
  });
});

describe('probeVideoFallback', () => {
  it('derives 30/1 fps from a 2s clip with a 60-frame hint', () => {
    const probed = probeVideoFallback(mockElement(), { frameCountHint: 60 });
    expect(probed.fps).toEqual({ num: 30, den: 1 });
    expect(probed.frameCount).toBe(60);
  });

  it('preserves NTSC 30000/1001 exactly (never a 29.97 float)', () => {
    const duration = (60 * 1001) / 30000;
    const probed = probeVideoFallback(mockElement({ duration }), {
      frameCountHint: 60,
    });
    expect(probed.fps).toEqual({ num: 30000, den: 1001 });
  });

  it('defaults fps to 30/1 with no hint and estimates frameCount from duration', () => {
    const probed = probeVideoFallback(mockElement(), {});
    expect(probed.fps).toEqual({ num: 30, den: 1 });
    expect(probed.frameCount).toBe(60);
  });

  it('returns frameCount 0 when duration is 0 and no hint is given', () => {
    const probed = probeVideoFallback(mockElement({ duration: 0 }), {});
    expect(probed.frameCount).toBe(0);
  });

  it('flags isVFR when frames were dropped', () => {
    const el = mockElement({
      getVideoPlaybackQuality: () => ({
        droppedVideoFrames: 3,
        totalVideoFrames: 60,
      }),
    });
    expect(probeVideoFallback(el, {}).isVFR).toBe(true);
  });

  it('reports isVFR false when the quality API is missing or nothing dropped', () => {
    expect(probeVideoFallback(mockElement(), {}).isVFR).toBe(false);
    const el = mockElement({
      getVideoPlaybackQuality: () => ({
        droppedVideoFrames: 0,
        totalVideoFrames: 60,
      }),
    });
    expect(probeVideoFallback(el, {}).isVFR).toBe(false);
  });

  it('passes through colorSpace/hasAlpha/codec and applies defaults', () => {
    const probed = probeVideoFallback(mockElement(), {
      colorSpace: 'srgb',
      hasAlpha: true,
      codec: 'avc1.42E01E',
    });
    expect(probed.colorSpace).toBe('srgb');
    expect(probed.hasAlpha).toBe(true);
    expect(probed.codec).toBe('avc1.42E01E');

    const defaults = probeVideoFallback(mockElement(), {});
    expect(defaults.colorSpace).toBe('unknown');
    expect(defaults.hasAlpha).toBe(false);
    expect(defaults.codec).toBe('');
  });

  it('reads width/height/duration from the element', () => {
    const probed = probeVideoFallback(mockElement(), {});
    expect(probed.width).toBe(1920);
    expect(probed.height).toBe(1080);
    expect(probed.duration).toBe(2);
  });
});

describe('probeVideo', () => {
  it('rejects with the browser-environment error in Node', async () => {
    const blob = new Blob(['fake video data'], { type: 'video/mp4' });
    await expect(probeVideo(blob)).rejects.toThrow(
      'WebCodecs parser requires a browser environment',
    );
  });
});
