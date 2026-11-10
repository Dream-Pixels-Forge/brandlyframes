---
"@brandlyframes/paths": minor
---

Add surreal/dream-logic SVG path morphing (BF-508, part of #91): `samplePath` (resamples an arbitrary SVG `d` to N arc-length-even points, approximating C/Q/A sub-segments), `polygonToPath`, `morphPaths(dA, dB, t, {samples, closed, rotateB})` (compatible-control-point resampling so *any* two closed shapes can melt into each other), and a frame-driven `<DreamMorph>` React component. Pure + deterministic; extends the existing `interpolatePath` (same-command-only) for genuinely incompatible shapes.
