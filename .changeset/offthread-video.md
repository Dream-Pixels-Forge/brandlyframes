---
'@brandlyframes/frames': minor
---

feat: add `<OffthreadVideo>` component + `OffthreadVideoDecoder` interface

Add `<OffthreadVideo>` — renders decoded video frames into a canvas driven by
the composition frame clock, reusing `mapFrameVideoIndex` (trim / playbackRate /
reverse / freeze / ping-pong) for frame mapping. The decode backend is injected
so the component is testable without real WebCodecs / FFmpeg.
