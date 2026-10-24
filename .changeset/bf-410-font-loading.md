---
'brandlyframes': minor
'@brandlyframes/fonts': minor
---

feat: font loading that just works (BF-410) — `useFont()` now auto-holds the frame via `holdFrame()`/`releaseFrame()` until every font source resolves, so the renderer never captures a frame with a fallback font. Supports local files, Google Fonts URLs and custom font URLs; timeout (10s) names the font URLs. Works with `@brandlyframes/fonts` `FontRegistry`, `loadFont()`, `loadFonts()`, `createFontSource()`, `createSystemFontSource()` and `googleFonts`. 37 tests pass, no network in tests.
