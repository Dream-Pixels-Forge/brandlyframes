import { createContext, type FC, type ReactNode } from 'react';
import type { AudioBufferLike } from '../hooks/audio-analysis';

/**
 * Audio data context (BF-130/131): maps a composition's audio `src` values to
 * decoded PCM buffers. Decoding happens outside the render path (the render is
 * a pure function of the frame number), so compositions inject their decoded
 * audio here — once per composition — and the per-frame hooks read the cached
 * analysis. Without a provider the audio hooks return neutral values, keeping
 * SSR / render workers deterministic.
 */

/** Raw React context mapping src → decoded buffer (null = no provider above). */
export const AudioDataContext = createContext<Readonly<Record<string, AudioBufferLike>> | null>(
  null,
);
AudioDataContext.displayName = 'AudioDataContext';

export type AudioDataProviderProps = {
  /** Decoded audio buffers keyed by the `src` passed to the audio hooks. */
  readonly sources: Readonly<Record<string, AudioBufferLike>>;
  children?: ReactNode;
};

/**
 * Provides decoded audio buffers to `useAudioData` / `useBeat` / `useLoudness`
 * / `useSpectrum`. Mount once per composition with every `src` the
 * composition's audio hooks reference.
 */
export const AudioDataProvider: FC<AudioDataProviderProps> = ({ sources, children }) => (
  <AudioDataContext.Provider value={sources}>{children}</AudioDataContext.Provider>
);
