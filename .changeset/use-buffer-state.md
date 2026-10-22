---
'brandlyframes': minor
---

feat: add `useBufferState` hook — media buffering state driven by the composition frame clock

Add `useBufferState(mediaElement)` + `computeBufferState()` for reporting whether
a media element is buffering and how much is buffered, driven by the frame
clock. The pure computation is dependency-free and Node-testable; the hook
subscribes to `progress`/`waiting`/`playing` events.
