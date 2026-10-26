/**
 * BF-222: translation + dubbing hooks.
 * All providers under test are in-memory fakes — no network is ever used.
 */

import { describe, expect, it } from 'vitest';
import {
  buildDubbingSegments,
  dubCues,
  getActiveDubbing,
  getCaptionTranslator,
  getDubbingProvider,
  registerCaptionTranslator,
  registerDubbingProvider,
  translateCues,
} from '../src/index';
import type { CaptionCue } from '../src/index';

const cues: CaptionCue[] = [
  { id: 'cue-0', startTime: 0, endTime: 2, text: 'Hello world' },
  { id: 'cue-1', startTime: 2.5, endTime: 5, text: 'Second line' },
];

describe('CaptionTranslator registry [BF-222]', () => {
  it('registers and resolves a translator by name', () => {
    const fake = {
      translate: (input: CaptionCue[]) => Promise.resolve(input),
    };
    registerCaptionTranslator('bf222-test', fake);
    expect(getCaptionTranslator('bf222-test')).toBe(fake);
  });

  it('returns undefined for unknown translators', () => {
    expect(getCaptionTranslator('bf222-missing')).toBeUndefined();
  });
});

describe('translateCues [BF-222]', () => {
  it('routes cues through the injected translator and preserves timing', async () => {
    registerCaptionTranslator('bf222-upper', {
      translate: (input, options) =>
        Promise.resolve(
          input.map((c) => ({ ...c, text: `${c.text.toUpperCase()}|${options.targetLanguage}` })),
        ),
    });
    const out = await translateCues(cues, 'de', 'bf222-upper');
    expect(out[0].text).toBe('HELLO WORLD|de');
    expect(out[0].startTime).toBe(0);
    expect(out[1].endTime).toBe(5);
  });

  it('throws a clear error when no translator is registered', async () => {
    await expect(translateCues(cues, 'de', 'bf222-none')).rejects.toThrow(/bf222-none/);
  });
});

describe('dubbing segment mapping [BF-222]', () => {
  it('builds one segment per cue with language and voice', () => {
    const segments = buildDubbingSegments(cues, { language: 'fr', voice: 'narrator' });
    expect(segments).toEqual([
      { id: 'dub-0', text: 'Hello world', startTime: 0, endTime: 2, language: 'fr', voice: 'narrator' },
      { id: 'dub-1', text: 'Second line', startTime: 2.5, endTime: 5, language: 'fr', voice: 'narrator' },
    ]);
  });

  it('registers a dubbing provider and resolves it by name', () => {
    const fake = { synthesize: () => Promise.resolve({ segmentId: 'x', src: 'a.mp3', durationSeconds: 1, language: 'fr' }) };
    registerDubbingProvider('bf222-dub', fake);
    expect(getDubbingProvider('bf222-dub')).toBe(fake);
  });

  it('dubs cues through the injected provider in segment order', async () => {
    registerDubbingProvider('bf222-fake-tts', {
      synthesize: (segment) =>
        Promise.resolve({
          segmentId: segment.id,
          src: `mock://tts/${segment.id}.mp3`,
          durationSeconds: segment.endTime - segment.startTime,
          language: segment.language,
        }),
    });
    const audio = await dubCues(cues, { language: 'fr', providerName: 'bf222-fake-tts' });
    expect(audio.map((a) => a.segmentId)).toEqual(['dub-0', 'dub-1']);
    expect(audio[0].src).toBe('mock://tts/dub-0.mp3');
  });

  it('throws a clear error when no dubbing provider is registered', async () => {
    await expect(dubCues(cues, { language: 'fr', providerName: 'bf222-nope' })).rejects.toThrow(
      /bf222-nope/,
    );
  });

  it('maps time to the active dubbed segment with offset and rate', async () => {
    const segments = buildDubbingSegments(cues, { language: 'fr' });
    // Audio longer than the cue slot → rate < 1 (slow down)
    const audio = [
      { segmentId: 'dub-0', src: 'mock://0.mp3', durationSeconds: 3, language: 'fr' },
      { segmentId: 'dub-1', src: 'mock://1.mp3', durationSeconds: 1, language: 'fr' },
    ];
    const at1 = getActiveDubbing(segments, audio, 1);
    expect(at1!.segment.id).toBe('dub-0');
    expect(at1!.audio.src).toBe('mock://0.mp3');
    expect(at1!.offsetSeconds).toBeCloseTo(1);
    expect(at1!.playbackRate).toBeCloseTo(3 / 2);

    // Between cues → null
    expect(getActiveDubbing(segments, audio, 2.2)).toBeNull();
    // Second segment
    expect(getActiveDubbing(segments, audio, 3)!.segment.id).toBe('dub-1');
    // Missing audio for the active segment → null
    expect(getActiveDubbing(segments, [audio[1]], 1)).toBeNull();
  });
});
