---
"@brandlyframes/fx": minor
---

Add emotion curve driving per-frame visual treatment (BF-507, part of #91): `sampleEmotionCurve` (linear keyframed valence/arousal, clamped at ends), `emotionLut` (mood-to-LUT: contrast from arousal, color temperature from valence, anchored identity endpoints), `emotionTreatment` (LUT + camera-speed multiplier + typography weight), `applyEmotionFrame`, `emotionAtFrame`. Pure deterministic — same curve + frame → byte-identical grade.
