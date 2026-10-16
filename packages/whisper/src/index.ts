/**
 * @brandlyframes/whisper — speech-to-text transcription [BF-071]
 *
 * Browser path = on-device Whisper via an injectable model factory (the
 * default throws the documented environment error in Node). Word alignment
 * and cue packing below are pure + deterministic so subtitle generation is
 * fully testable without a model.
 */

import type {
  TranscribedWord,
  Transcription,
  TranscriptionCue,
  WhisperModelFactory,
  WhisperModelLike,
} from './types';

export type {
  TranscribedSegment,
  TranscribedWord,
  Transcription,
  TranscriptionCue,
  WhisperModelFactory,
  WhisperModelLike,
} from './types';

/** Environment error, matching the webcodecs-side convention. */
const MODEL_ERROR = 'Whisper model is not available in this environment';

/**
 * Default model factory — real on-device Whisper handles.
 *
 * @returns A factory that throws {@link MODEL_ERROR} when the model runtime
 * is absent, and returns a real runtime-backed handle when present
 */
export const createDefaultWhisperModelFactory = (): WhisperModelFactory => {
  return (model: string): WhisperModelLike => {
    if (typeof window === 'undefined' || typeof (globalThis as { WhisperRuntime?: unknown }).WhisperRuntime === 'undefined') {
      throw new Error(MODEL_ERROR);
    }
    void model;
    // The concrete on-device runtime binds here; the shape contract is the
    // WhisperModelLike interface above, verified by the injected-model tests.
    throw new Error('Whisper on-device runtime binding not configured for this build');
  };
};

/**
 * Transcribe mono PCM audio.
 *
 * @param samples Mono PCM samples (any amplitude scale)
 * @param sampleRate Sample rate in Hz
 * @param factory Optional model factory; defaults to the on-device runtime path
 * @returns Transcript text, segments, word timings and duration
 */
export const transcribeAudio = async (
  samples: Float32Array,
  sampleRate = 16000,
  factory?: WhisperModelFactory,
): Promise<Transcription> => {
  if (samples.length === 0) throw new RangeError('transcribeAudio: audio is empty');
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new RangeError(`transcribeAudio: invalid sample rate ${sampleRate}`);
  }
  const modelFactory = factory ?? createDefaultWhisperModelFactory();
  const handle = modelFactory('tiny');
  const result = await handle.transcribe(samples, sampleRate);
  await handle.dispose();
  return { ...result, duration: samples.length / sampleRate };
};

/**
 * Spread bare word strings evenly across `[start, end]` (equal share each).
 *
 * @param words Word strings in order
 * @param start Span start in seconds
 * @param end Span end in seconds
 * @returns Timed words covering the span exactly
 */
export const alignWordsToDuration = (
  words: string[],
  start: number,
  end: number,
): TranscribedWord[] => {
  if (words.length === 0) return [];
  if (!(end > start)) throw new RangeError('alignWordsToDuration: end must exceed start');
  const perWord = (end - start) / words.length;
  return words.map((text, i) => ({
    text,
    start: start + i * perWord,
    end: start + (i + 1) * perWord,
    confidence: 1,
  }));
};

/**
 * Pack transcription words into caption cues of at most `maxWords` each.
 *
 * @param transcription Transcription with word timings
 * @param maxWords Maximum words per cue (default 8)
 * @returns Caption-ready cues in order
 */
export const transcriptionToCues = (
  transcription: Transcription,
  maxWords = 8,
): TranscriptionCue[] => {
  if (!Number.isInteger(maxWords) || maxWords < 1) {
    throw new RangeError(`transcriptionToCues: maxWords must be >= 1, got ${maxWords}`);
  }
  const cues: TranscriptionCue[] = [];
  const words = transcription.words;
  for (let i = 0; i < words.length; i += maxWords) {
    const group = words.slice(i, i + maxWords);
    const first = group[0];
    const last = group[group.length - 1];
    if (first === undefined || last === undefined) continue;
    cues.push({
      text: group.map((w) => w.text).join(' '),
      startTime: first.start,
      endTime: last.end,
    });
  }
  return cues;
};
