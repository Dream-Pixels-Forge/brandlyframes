---
'@brandlyframes/player': minor
---

v0.1 "Premiere" player phase (BF-030 to BF-032).

- **BF-030** — `<Player>` component: embeddable web player with controls, loop, autoplay, inputProps, width/height, className/style, and event callbacks (onPlay, onPause, onFrameChange, onEnded, onError).
- **BF-031** — Imperative ref API: play(), pause(), seekTo(frame), getCurrentFrame(), getDurationInFrames(), getPlaybackRate(), setPlaybackRate(rate), isPlaying() via forwardRef + useImperativeHandle.
- **BF-032** — Frame-exact seeking: seekTo lands precisely on the requested 0-indexed frame without timestamp drift, across browsers. Seek-accuracy test suite added.

Also: docs page at `/docs/player`, code examples in `docs-site/src/code-examples/player.ts`, and a changeset for the `@brandlyframes/player` package (v0.1.0 → v0.2.0).
