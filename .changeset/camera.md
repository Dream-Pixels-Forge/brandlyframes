---
'@brandlyframes/camera': minor
---

feat: add deterministic `<Camera>` component (dolly, pan, parallax) [BF-211]

Add `@brandlyframes/camera` package:
- `<Camera>` applies a deterministic camera move (dolly/pan/parallax) to wrapped children
- `useCameraTransform(move)` hook returns `{ translateX, translateY, scaleX, scaleY, rotation, frame, progress, mode }`
- `computeCameraTransform(frame, move)` pure transform function — no `Math.random`, no `Date.now`, no wall clock
- All transforms derive from the current frame via `useCurrentFrame()`, so previews and renders match
- 15 unit tests covering frame-specific transforms, all 3 modes, clamping, determinism, and SSR render output
