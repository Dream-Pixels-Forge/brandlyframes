/**
 * `useAudio` — React hook wrapper over {@link analyzeAudio}.
 *
 * Loads + analyzes a WAV file on mount (or when `src` changes) and exposes
 * the analysis plus a `frame`-indexed accessor. Deterministic: the same
 * `src` + `fps` always yields the same analysis.
 */

import { useMemo } from 'react';
import {
  analyzeAudio,
  getBeatAtFrame,
  type AnalyzeAudioOptions,
  type AudioAnalysis,
  type Beat,
} from './audio-reactive';

export interface UseAudioResult {
  /** The full analysis (null until the file is loaded). */
  readonly analysis: AudioAnalysis | null;
  /** The beat at or before the given composition frame. */
  readonly beatAt: (frame: number) => Beat | null;
  /** The spectrum row at the given composition frame. */
  readonly spectrumAt: (frame: number) => readonly number[] | undefined;
  /** Loudness [0,1] at the given composition frame. */
  readonly loudnessAt: (frame: number) => number;
}

/**
 * Analyze a WAV file and expose per-frame accessors. The file is read
 * synchronously via `node:fs` (server-side rendering / build-time); in a
 * browser build the consumer is expected to pass an already-loaded buffer
 * through a custom hook.
 *
 * @param src - WAV file path or raw buffer
 * @param options - fps, spectrum, beats options
 */
export function useAudio(src: string, options: AnalyzeOptionsProp = {}): UseAudioResult {
  const analysis = useMemo(() => {
    try {
      return analyzeAudio(src, options);
    } catch {
      return null;
    }
  }, [src, options]);

  const beatAt = (frame: number) => (analysis ? getBeatAtFrame(analysis, frame) : null);
  const spectrumAt = (frame: number) => analysis?.spectrum[frame];
  const loudnessAt = (frame: number) => analysis?.loudness[frame] ?? 0;

  return { analysis, beatAt, spectrumAt, loudnessAt };
}

type AnalyzeOptionsProp = AnalyzeAudioOptions;
