---
"@brandlyframes/fx": minor
---

Add anamorphic & lens character emulation (BF-502, closes #90): `applyBokeh` (DOF with custom aperture-blade counts — circular/hexagonal/octagonal highlights), `applyHorizontalFlare` (2× scope-flare streaks), `applyFocusBreathing` (frame-driven focal shimmer), `applyVintageVignette` (corner falloff + oil-slick mottle), `applyAnamorphic` (2× squeeze/release), and a `makeLensCharacterLut` tonal grade. All pure deterministic pixel math — no GPU, no wall clock.
