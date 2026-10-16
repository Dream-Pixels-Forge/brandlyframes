/**
 * @brandlyframes/whisper — shared public types [BF-071]
 */

/** One transcribed word with timing. */
export interface TranscribedWord {
  text: string;
  /** Start time in seconds. */
  start: number;
  /** End time in seconds. */
  end: number;
  /** Model confidence 0..1. */
  confidence: number;
}

/** One transcribed segment (a sentence-ish span). */
export interface TranscribedSegment {
  start: number;
  end: number;
  text: string;
}

/** Full transcription result. */
export interface Transcription {
  /** Complete transcript text. */
  text: string;
  /** Detected or requested language code (e.g. `'en'`). */
  language: string;
  segments: TranscribedSegment[];
  /** Word-level timings (may be empty when the model omits them). */
  words: TranscribedWord[];
  /** Audio duration in seconds. */
  duration: number;
}

/** A Whisper-class model handle (real or fake). */
export interface WhisperModelLike {
  /** Model identifier (e.g. `'tiny'`, `'base'`). */
  model: string;
  /** Language the model was loaded for. */
  language: string;
  /** Transcribe mono PCM samples at `sampleRate` Hz. */
  transcribe(samples: Float32Array, sampleRate: number): Promise<Transcription>;
  /** Release the model. Idempotent. */
  dispose(): Promise<void>;
}

/** A function that produces a {@link WhisperModelLike} for a model id. */
export type WhisperModelFactory = (model: string) => WhisperModelLike;

/** One caption-ready cue derived from a transcription. */
export interface TranscriptionCue {
  text: string;
  startTime: number;
  endTime: number;
}
