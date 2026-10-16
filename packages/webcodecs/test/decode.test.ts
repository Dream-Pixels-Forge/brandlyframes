/**
 * RED phase — decode.ts [BF-071 webcodecs]
 *
 * Real WebCodecs decode paths, testable in Node by injecting codec
 * capability factories and frame iterators (no real `VideoDecoder` needed
 * in tests; the browser glue is isolated in `createDefaultVideoCodecFactory`
 * and friends).
 */

import { describe, it, expect } from 'vitest';
import {
  probeVideoDecode,
  probeAudioDecode,
  createDefaultVideoCodecFactory,
  createDefaultAudioCodecFactory,
  isBrowserWithWebCodecs,
} from '../src/decode';
import type { VideoCodecLike, AudioCodecLike, DecodedVideoFrameLike } from '../src/decode';

describe('decode helpers', () => {
  describe('isBrowserWithWebCodecs', () => {
    it('reports false in Node', () => {
      expect(isBrowserWithWebCodecs()).toBe(false);
    });
  });

  describe('createDefaultVideoCodecFactory', () => {
    it('throws the environment error when WebCodecs globals are absent', () => {
      const factory = createDefaultVideoCodecFactory();
      expect(() => factory('vp09.00.10.08')).toThrow(
        'WebCodecs VideoDecoder is not available in this environment',
      );
    });
  });

  describe('createDefaultAudioCodecFactory', () => {
    it('throws the environment error when WebCodecs globals are absent', () => {
      const factory = createDefaultAudioCodecFactory();
      expect(() => factory('mp4a.40.2')).toThrow(
        'WebCodecs AudioDecoder is not available in this environment',
      );
    });
  });
});

/** A fake video codec that emits N frames at a fixed fps through its queue. */
const makeFakeVideoCodec = (fps: number, frameCount: number): VideoCodecLike => {
  const frames: DecodedVideoFrameLike[] = [];
  for (let i = 0; i < frameCount; i++) {
    // Exact integer µs: frame i is at i * (1_000_000 / fps) µs.
    // For fps that divides 1_000_000 evenly (30, 24, 60, etc.) this is exact.
    // For NTSC (30000/1001) the caller constructs frames directly.
    frames.push({
      timestampMicroseconds: (i * 1_000_000) / fps,
      durationMicroseconds: 1_000_000 / fps,
    });
  }
  let queue: DecodedVideoFrameLike[] = frames;
  return {
    flushFrames: async (): Promise<DecodedVideoFrameLike[]> => {
      const out = queue;
      queue = [];
      return out;
    },
    close: async (): Promise<void> => {
      /* nothing to release in the fake */
    },
  };
};

describe('probeVideoDecode', () => {
  it('rejects in Node without an injected codec factory', async () => {
    await expect(probeVideoDecode(new Blob(['x']))).rejects.toThrow(
      'WebCodecs VideoDecoder is not available in this environment',
    );
  });

  it('rejects when the codec factory throws an environment error', async () => {
    await expect(
      probeVideoDecode(new Blob(['x']), undefined, createDefaultVideoCodecFactory()),
    ).rejects.toThrow('not available in this environment');
  });

  it('derives exact-rational fps from frame timestamps', async () => {
    const probe = await probeVideoDecode(new Blob(['x']), () =>
      makeFakeVideoCodec(30, 90),
    );
    expect(probe.fps).toEqual({ num: 30, den: 1 });
    expect(probe.frameCount).toBe(90);
    expect(probe.duration).toBeCloseTo(3, 10);
  });

  it('round-trips NTSC 30000/1001 when timestamps use 1001-based microsecond math', async () => {
    // 60 frames at exactly 30000/1001 fps. Real VideoDecoder reports integer
    // µs timestamps with sub-µs rounding drift; fpsFromFrames snaps to the
    // well-known rate when within tolerance.
    const fpsNum = 30000;
    const fpsDen = 1001;
    const frames: DecodedVideoFrameLike[] = [];
    for (let i = 0; i < 60; i++) {
      frames.push({
        timestampMicroseconds: Math.round((i * 1_000_000 * fpsDen) / fpsNum),
        durationMicroseconds: Math.round((1_000_000 * fpsDen) / fpsNum),
      });
    }
    const probe = await probeVideoDecode(
      new Blob(['x']),
      () =>
        ({
          flushFrames: async (): Promise<DecodedVideoFrameLike[]> => frames,
          close: async (): Promise<void> => {
            /* fake */
          },
        } satisfies VideoCodecLike),
    );
    expect(probe.fps).toEqual({ num: 30000, den: 1001 });
    expect(probe.frameCount).toBe(60);
    expect(probe.duration).toBeCloseTo((60 * 1001) / 30000, 3);
  });

  it('falls back to the 30/1 default when fewer than two frames are available', async () => {
    const probe = await probeVideoDecode(new Blob(['x']), () => makeFakeVideoCodec(24, 1));
    expect(probe.fps).toEqual({ num: 30, den: 1 });
    expect(probe.frameCount).toBe(1);
  });
});

/** A fake audio codec that reports real codec metadata + one frame batch. */
const makeFakeAudioCodec = (
  sampleRate: number,
  channelCount: number,
  frames: number,
): AudioCodecLike => ({
  metadata: { sampleRate, channelCount, codec: 'mp4a.40.2' },
  frames,
  close: async (): Promise<void> => {
    /* fake */
  },
});

describe('probeAudioDecode', () => {
  it('rejects in Node without an injected codec factory', async () => {
    await expect(probeAudioDecode(new Blob(['x']))).rejects.toThrow(
      'WebCodecs AudioDecoder is not available in this environment',
    );
  });

  it('reports real sampleRate / channelCount / codec from the decoder', async () => {
    const probe = await probeAudioDecode(
      new Blob(['x']),
      () => makeFakeAudioCodec(48000, 2, 10),
    );
    expect(probe.sampleRate).toBe(48000);
    expect(probe.channelCount).toBe(2);
    expect(probe.codec).toBe('mp4a.40.2');
  });

  it('derives duration from decoded frame count and sample rate', async () => {
    const probe = await probeAudioDecode(
      new Blob(['x']),
      () => makeFakeAudioCodec(44100, 1, 44100 * 2), // 2s of mono audio
    );
    expect(probe.duration).toBeCloseTo(2, 10);
  });
});
