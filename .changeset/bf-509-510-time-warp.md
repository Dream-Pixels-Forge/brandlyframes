---
"@brandlyframes/frames": minor
---

Add deterministic time-warp math for polyrhythmic per-layer frame rates (BF-509) and reverse/ping-pong playback (BF-510): `reverseFrame`, `pingPongFrame`, `variableSpeedFrame`, `layerFrame`, `layerTimeline`, and `timeWarpFrame` — all pure functions, no wall clock or `Math.random`, so preview and render match.
