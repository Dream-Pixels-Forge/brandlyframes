---
"@brandlyframes/fx": minor
---

Add deterministic volumetric light & particle systems (BF-504): seeded `ParticleSystem` (snow/dust/embers), `renderParticles`, `applyGodRays` (radial light-ray bloom), and `applyVolumetricDust`. All pure pixel math — no `Math.random`, no wall clock — so preview and render match byte-for-byte.
