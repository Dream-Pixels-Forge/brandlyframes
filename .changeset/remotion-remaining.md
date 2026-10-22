---
'brandlyframes': minor
---

feat: close more Remotion API gaps in `@brandlyframes/core` — add bounded `MediaCache` (LRU with `maxSize`), `formatSequenceTrace`/`SequenceScope` (nested sequence stack traces), `useCurrentScale` (device-pixel scale hook) and `useIsInsideNonPremountFreeze` (freeze-scope hook via new `FreezeContext`); `<Freeze>` now provides freeze context to its subtree.
