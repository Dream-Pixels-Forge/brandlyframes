---
'@brandlyframes/cli': patch
---

feat: add `--log verbose` slow-frame report to `render` command [BF-424]

- `brandlyframes render --log verbose` now prints a slow-frame report after every render
- Reports average ms/frame, slow frames (>33 ms), and the top 5 slowest frames
- Basic version of the P14 frame profiler
