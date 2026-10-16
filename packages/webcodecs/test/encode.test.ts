/**
 * RED phase — encode.ts [BF-071 webcodecs]
 *
 * Real WebCodecs encode paths, Node-testable via injectable encoder
 * factories (the browser glue throws the documented environment error).
 */

import { describe, it, expect } from 'vitest';
import {
  encodeVideoFrames,
  encodeAudioFrames,
  createDefaultVideoEncoderFactory,
  createDefaultAudioEncoderFactory,
} from '../src/encode';
import type { VideoEncoderLike, AudioEncoderLike } from '../src/encode';

/** A fake video encoder that records frames and emits one chunk per frame. */
const makeFakeVideoEncoder = (): VideoEncoderLike => {
  const chunks: { byteLength: number; durationMicroseconds: number }[] = [];
  return {
    feedFrame: (frame: { durationMicroseconds: number }): void => {
      chunks.push({ byteLength: 100, durationMicroseconds: frame.durationMicroseconds });
    },
    flushChunks: async () => chunks,
    close: async (): Promise<void> => {
      /* fake */
    },
  };
};

describe('encodeVideoFrames', () => {
  it('rejects in Node without an injected encoder factory', async () => {
    await expect(
      encodeVideoFrames([{ timestampMicroseconds: 0, durationMicroseconds: 33333 }]),
    ).rejects.toThrow('WebCodecs VideoEncoder is not available in this environment');
  });

  it('emits one chunk per frame and sums byte length', async () => {
    const result = await encodeVideoFrames(
      [
        { timestampMicroseconds: 0, durationMicroseconds: 33333 },
        { timestampMicroseconds: 33333, durationMicroseconds: 33333 },
      ],
      () => makeFakeVideoEncoder(),
    );
    expect(result.chunkCount).toBe(2);
    expect(result.byteLength).toBe(200);
    expect(result.duration).toBeCloseTo(66666 / 1_000_000, 10);
  });
});

describe('encodeAudioFrames', () => {
  it('rejects in Node without an injected encoder factory', async () => {
    await expect(encodeAudioFrames(48000, 2, 96000)).rejects.toThrow(
      'WebCodecs AudioEncoder is not available in this environment',
    );
  });

  it('derives duration from sample count and sample rate', async () => {
    const fake: AudioEncoderLike = {
      metadata: { sampleRate: 48000, channelCount: 2, codec: 'mp4a.40.2' },
      feedSamples: (): void => {
        /* fake */
      },
      flushChunks: async () => [{ byteLength: 400 }],
      close: async (): Promise<void> => {
        /* fake */
      },
    };
    const result = await encodeAudioFrames(48000, 2, 96000, () => fake);
    expect(result.chunkCount).toBe(1);
    expect(result.byteLength).toBe(400);
    expect(result.duration).toBeCloseTo(2, 10);
  });
});

describe('default encoder factories', () => {
  it('video factory throws the environment error when globals are absent', () => {
    const factory = createDefaultVideoEncoderFactory();
    expect(() => factory('vp09.00.10.08')).toThrow(
      'WebCodecs VideoEncoder is not available in this environment',
    );
  });

  it('audio factory throws the environment error when globals are absent', () => {
    const factory = createDefaultAudioEncoderFactory();
    expect(() => factory('mp4a.40.2')).toThrow(
      'WebCodecs AudioEncoder is not available in this environment',
    );
  });
});
