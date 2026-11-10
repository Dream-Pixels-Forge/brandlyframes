---
"@brandlyframes/audio-reactive": minor
---

Real audio analysis (BF-511/512 foundation): `analyzeAudio` now decodes 16-bit PCM WAV buffers/files, computes a per-frame magnitude spectrum (hand-rolled radix-2 FFT + Hann window, no external deps), per-frame RMS loudness, and spectral-flux beat detection with a refractory period. Includes `getBeatAtFrame` (binary search), a `useAudio` React hook, and synthetic `makeWav`/`makeBeatedWav` fixtures so CI never needs a live audio file. 13 new tests.
