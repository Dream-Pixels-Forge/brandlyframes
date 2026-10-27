# @brandlyframes/export-browser

## 1.1.0

### Minor Changes

- 8d66a6a: feat: add browser-side video/audio export via WebCodecs [BF-201]

  Add `@brandlyframes/export-browser` package for client-side media export
  with no server involvement:
  - `muxMp4()` / `muxWebm()` pure ISO BMFF / EBML muxers — testable in Node,
    deterministic output, valid container boxes/headers
  - `exportVideoBrowser()` / `exportAudioBrowser()` — WebCodecs-backed encode +
    mux + browser download; throw a clear error outside a browser
  - Tests: 9 tests covering muxer validity, determinism, and export API shape.
    Type-check, lint, and build clean.

### Patch Changes

- @brandlyframes/webcodecs@1.1.0
