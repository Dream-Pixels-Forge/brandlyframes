# @brandlyframes/camera

## 1.1.0

### Minor Changes

- 8d66a6a: feat: add deterministic `<Camera>` component (dolly, pan, parallax) [BF-211]

  Add `@brandlyframes/camera` package:
  - `<Camera>` applies a deterministic camera move (dolly/pan/parallax) to wrapped children
  - `useCameraTransform(move)` hook returns `{ translateX, translateY, scaleX, scaleY, rotation, frame, progress, mode }`
  - `computeCameraTransform(frame, move)` pure transform function — no `Math.random`, no `Date.now`, no wall clock
  - All transforms derive from the current frame via `useCurrentFrame()`, so previews and renders match
  - 15 unit tests covering frame-specific transforms, all 3 modes, clamping, determinism, and SSR render output

### Patch Changes

- Updated dependencies [efd26c7]
- Updated dependencies [a4451f5]
- Updated dependencies [46eabf7]
- Updated dependencies [5c74417]
- Updated dependencies [f97773c]
- Updated dependencies [2b9c535]
- Updated dependencies [9c4ec35]
- Updated dependencies [5581e9c]
- Updated dependencies [5f0f50b]
- Updated dependencies [6510b97]
  - brandlyframes@1.1.0
  - @brandlyframes/fx@1.1.0
