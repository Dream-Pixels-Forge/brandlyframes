---
'@brandlyframes/renderer': minor
---

feat: BF-450 add `detectVideoUsage` for `<Video>` auto-promotion

Add `detectVideoUsage(source)` — scans a composition source for `<Video>`
JSX usage so the render pipeline can transparently route `<Video>` frames
through the FFmpeg frame-exact decode backend instead of Chrome screenshot
capture (auto-promotion, no user opt-in). Includes golden-frame byte-identity
tests proving FFmpeg-decode output matches Chrome-screenshot output on CFR
sources.

The CLI render `build` command wiring + opt-out flag follow in a subsequent
change.
