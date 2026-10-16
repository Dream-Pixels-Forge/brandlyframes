/**
 * RED phase — @brandlyframes/whisper [BF-071]
 *
 * Speech-to-text that feeds the captions pipeline. Browser path = on-device
 * Whisper via injectable model factory (env error in Node); word alignment
 * is pure + deterministic (evenly spaced words over duration by default).
 */

import { describe, it, expect } from 'vitest';
import {
  transcribeAudio,
  alignWordsToDuration,
  transcriptionToCues,
  createDefaultWhisperModelFactory,
} from '../src/index';
import type { WhisperModelLike } from '../src/index';

/** A fake model that splits input text into timed words. */
const makeFakeModel = (words: { text: string; start: number; end: number }[]): WhisperModelLike => ({
  model: 'fake-tiny',
  language: 'en',
  transcribe: async () => ({
    text: words.map((w) => w.text).join(' '),
    language: 'en',
    segments: [{ start: 0, end: 2, text: words.map((w) => w.text).join(' ') }],
    words: words.map((w) => ({ text: w.text, start: w.start, end: w.end, confidence: 1 })),
  }),
  dispose: async (): Promise<void> => {
    /* fake */
  },
});

describe('transcribeAudio', () => {
  it('rejects in Node without an injected model factory', async () => {
    await expect(transcribeAudio(new Float32Array(16000))).rejects.toThrow(
      'Whisper model is not available in this environment',
    );
  });

  it('returns transcript text and word timings from the model', async () => {
    const result = await transcribeAudio(
      new Float32Array(32000),
      16000,
      () =>
        makeFakeModel([
          { text: 'Hello', start: 0, end: 1 },
          { text: 'world', start: 1, end: 2 },
        ]),
    );
    expect(result.text).toBe('Hello world');
    expect(result.words).toHaveLength(2);
    expect(result.words[1].end).toBe(2);
    expect(result.duration).toBeCloseTo(2, 10);
  });

  it('rejects empty audio', async () => {
    await expect(transcribeAudio(new Float32Array(0), 16000, () => makeFakeModel([]))).rejects.toThrow(
      /empty/i,
    );
  });
});

describe('alignWordsToDuration', () => {
  it('spreads words evenly over the duration', () => {
    const words = alignWordsToDuration(['Hello', 'world'], 0, 2);
    expect(words).toHaveLength(2);
    expect(words[0]).toMatchObject({ text: 'Hello', start: 0, end: 1 });
    expect(words[1]).toMatchObject({ text: 'world', start: 1, end: 2 });
  });

  it('handles a single word covering the whole span', () => {
    const words = alignWordsToDuration(['Hello'], 5, 10);
    expect(words[0]).toMatchObject({ start: 5, end: 10 });
  });
});

describe('transcriptionToCues', () => {
  it('packs words into cues of at most maxWords', () => {
    const result = transcriptionToCues(
      {
        text: 'a b c d e',
        language: 'en',
        segments: [],
        words: [
          { text: 'a', start: 0, end: 1, confidence: 1 },
          { text: 'b', start: 1, end: 2, confidence: 1 },
          { text: 'c', start: 2, end: 3, confidence: 1 },
          { text: 'd', start: 3, end: 4, confidence: 1 },
          { text: 'e', start: 4, end: 5, confidence: 1 },
        ],
        duration: 5,
      },
      2,
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ text: 'a b', startTime: 0, endTime: 2 });
    expect(result[2]).toMatchObject({ text: 'e', startTime: 4, endTime: 5 });
  });
});

describe('createDefaultWhisperModelFactory', () => {
  it('throws the environment error when the model runtime is absent', () => {
    const factory = createDefaultWhisperModelFactory();
    expect(() => factory('tiny')).toThrow('Whisper model is not available in this environment');
  });
});
