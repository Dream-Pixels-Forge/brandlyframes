/**
 * Audio-reactive hooks (BF-130): per-frame values derived from decoded audio,
 * deterministic by frame. Each hook resolves `src` through the
 * {@link AudioDataProvider} (decoded PCM injected once per composition),
 * reads the cached pre-computed analysis (BF-131, parse once — see
 * `audio-analysis.ts`) and samples it at `useCurrentFrame()`. Compositions
 * render the same pixels for the same frame regardless of environment.
 *
 * With no provider (or an unregistered src) the hooks return neutral values —
 * `hasAudio: false`, zero loudness, empty spectrum, no beat — so SSR and
 * render workers stay deterministic. Like every frame hook they require a
 * `<FrameContextProvider>` (mounted automatically by `<Composition>`).
 */

import { useContext } from 'react';
import { AudioDataContext } from '../context/audio-data-context';
import { useCurrentFrame } from './use-current-frame';
import { useVideoConfig } from './use-video-config';
import {
  getAudioAnalysis,
  getBeatAtFrame,
  getLoudnessAtFrame,
  getSpectrumAtFrame,
  type AudioBufferLike,
  type Beat,
} from './audio-analysis';

/** Per-frame audio values for one `src` at the current frame. */
export type AudioFrameData = {
  /** False when no decoded audio is registered for this `src` — all other values are neutral. */
  readonly hasAudio: boolean;
  /** Loudness (RMS, 0..1) at the current frame. */
  readonly loudness: number;
  /** Spectrum band magnitudes (0..1) at the current frame. */
  readonly spectrum: readonly number[];
  /** Beat active at the current frame, or null. */
  readonly beat: Beat | null;
  /** Total frames the analysis covers on the composition's fps grid. */
  readonly durationInFrames: number;
};

/** Neutral result for missing audio (SSR / unregistered src). */
const NEUTRAL_AUDIO_FRAME_DATA: AudioFrameData = {
  hasAudio: false,
  loudness: 0,
  spectrum: [],
  beat: null,
  durationInFrames: 0,
};

/** Resolves a src to its decoded buffer via the audio data provider. */
const useAudioBuffer = (src: string): AudioBufferLike | undefined => {
  const sources = useContext(AudioDataContext);
  return sources?.[src];
};

/**
 * All per-frame audio values for `src` at the current frame: loudness,
 * spectrum bands and the active beat, derived from the cached analysis of the
 * decoded audio registered for `src` in `<AudioDataProvider>`.
 */
export const useAudioData = (src: string): AudioFrameData => {
  const buffer = useAudioBuffer(src);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!buffer) return NEUTRAL_AUDIO_FRAME_DATA;
  const analysis = getAudioAnalysis(buffer, { fps });
  return {
    hasAudio: true,
    loudness: getLoudnessAtFrame(analysis, frame),
    spectrum: getSpectrumAtFrame(analysis, frame),
    beat: getBeatAtFrame(analysis, frame),
    durationInFrames: analysis.durationInFrames,
  };
};

/**
 * Loudness (RMS, 0..1) of `src` at the current frame — `0` without registered
 * audio. Drives level meters, shakes, pulses: any visual that tracks volume.
 */
export const useLoudness = (src: string): number => useAudioData(src).loudness;

/**
 * Spectrum band magnitudes (0..1) of `src` at the current frame — `[]`
 * without registered audio. Bands are log-spaced 20Hz→Nyquist; index 0 is the
 * lowest band. Drives equalizer bars and frequency-mapped visuals.
 */
export const useSpectrum = (src: string): readonly number[] => useAudioData(src).spectrum;

/**
 * The beat of `src` active at the current frame, or null — beats stay active
 * for their window (default: the onset frame plus one) and carry the onset's
 * strength. Drives beat-synced pulses; the active window makes visuals land
 * on the beat, not one frame after it.
 */
export const useBeat = (src: string): Beat | null => useAudioData(src).beat;
