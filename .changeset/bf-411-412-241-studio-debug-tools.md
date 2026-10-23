---
'@brandlyframes/studio': minor
---

feat: add studio debugging tools [BF-411, BF-412, BF-241]

- BF-411 error overlay: `ErrorCapture` records render errors with failing component name, frame number and props snapshot; `suggestFix()` maps common React/JS error messages to best-effort fixes; `extractComponentName()` parses component/error stacks. `ErrorOverlay` now renders component name, props snapshot and suggested fix.
- BF-412 frame inspector: click any element in the preview -> panel shows computed props/styles at the current frame. `resolveElementProps()` walks React fibers (`__reactFiber$`/`__reactProps$`), `InspectorRegistry` allows explicit element->props registration, `getElementStyles()` snapshots computed styles, `useFrameInspector()` wires preview clicks to the panel.
- BF-241 time-travel debugger: `FrameHistory` ring buffer of already-rendered frames with cursor-based back/forward scrubbing (no re-render) and `jump()`; `TimeTravelDebugger` adds back/forward buttons and jump-to-first-error-frame (from `ErrorCapture.firstErrorFrame`).

Unit tests (66 total, jsdom) cover error capture, inspector registry/fiber walk, and the history ring buffer.
