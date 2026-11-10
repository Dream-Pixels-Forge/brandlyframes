/**
 * @brandlyframes/audio-reactive — beat detection, loudness, and spectrum
 * per frame. Clean-room, deterministic: same WAV + options → same output.
 *
 * This module re-exports the analysis API; the React hooks (useAudio) are
 * in index.tsx.
 */
export type {
  Beat,
  LoudnessTrack,
  SpectrumTrack,
  AudioAnalysis,
  AnalyzeAudioOptions,
} from './analysis';
export { analyzeAudio, getBeatAtFrame } from './analysis';
export type {
  WavData,
  SpectrumFrameOptions,
  BeatDetectionOptions,
} from './wav';
export {
  decodeWav,
  fft,
  nextPow2,
  spectrumFrames,
  detectBeats,
  makeWav,
  makeBeatedWav,
} from './wav';
