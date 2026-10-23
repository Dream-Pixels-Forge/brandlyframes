---
'brandlyframes': minor
---

feat: complete core utilities (BF-400, BF-401) — add `random(seed, min, max)` (scales the same deterministic value into `[min, max)`), `randomInt` (inclusive integer range) and `randomPick` seeded helpers, plus an ESLint rule banning bare `Math.random()` in composition source (wired in the root flat config, with a lint fixture). `random(seed)`, `sec()`, `ms()`, `tc()` and `useMarker()` shipped in v1.0.0.
