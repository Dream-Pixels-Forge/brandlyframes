---
'brandlyframes': minor
---

feat: add audio-reactive hooks — `useAudioData`, `useBeat`, `useLoudness`, `useSpectrum` [BF-130, BF-131, BF-132]

Add per-frame audio hooks that are deterministic by frame: loudness (RMS), log-spaced
spectrum bands and beat onsets derived from decoded audio. Analysis is pre-computed
once per buffer+fps (`analyzeAudioBuffer` / `getAudioAnalysis` — an FFT-based pure
engine, no React/DOM/network) and sampled per frame, so rendering stays a pure
function of the frame number. Sources are injected per composition via the new
`<AudioDataProvider sources={{ [src]: AudioBufferLike }}>`; without a provider the
hooks return neutral values (SSR / render workers stay deterministic). Includes a
beat-synced demo fixture whose visual lands within ±1 frame of every detected beat
(`test/fixtures/demo/beat-demo.fixture.tsx`).
