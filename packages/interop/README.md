# @brandlyframes/interop

Composition interop for [BrandlyFrames](https://github.com/Dream-Pixels-Forge/brandlyframes):

- **BF-230 — HyperFrames HTML import.** Parse a HyperFrames composition
  document into BrandlyFrames composition IR. Unknown nodes become
  `<Sequence>` placeholders with warnings; malformed HTML never throws.
- **BF-231 — NLE export.** Export a composition timeline to OpenTimelineIO
  JSON, CMX3600 EDL and FCP XML (xmeml v4), each with a round-trip parser
  validated against our own exports.

Self-contained: no dependency on `brandlyframes` core, no network, no native
code. Works in Node and browsers. Clean-room: original code and API names
only; the HyperFrames `data-*` timing contract is read as a spec, not copied.

```ts
import {
  parseHyperFramesHtml,
  exportOtio,
  parseOtio,
  exportEdl,
  exportFcpXml,
  type CompositionIR,
} from '@brandlyframes/interop';

const { composition, warnings } = parseHyperFramesHtml(html); // BF-230
const otioJson: string = exportOtio(composition); // BF-231
const roundTripped: CompositionIR = parseOtio(otioJson); // lossless for our exports
```

## BF-230 — HyperFrames HTML contract

An HTML document describes a timeline declaratively. The parser maps:

| Contract element | Selector / attribute                                                                       | IR mapping                       |
| ---------------- | ------------------------------------------------------------------------------------------ | -------------------------------- |
| Composition root | class `hyperframes-composition` or `data-hf-composition` (first in document order)         | `CompositionIR`                  |
| Frame rate       | root `data-fps` (default `30`)                                                             | `fps`                            |
| Canvas size      | root `data-width` / `data-height` (default `1920`×`1080`)                                  | `width`, `height`                |
| Duration         | root `data-duration-frames` (default: latest clip end)                                     | `durationInFrames`               |
| Identity         | root `id` / `data-name`                                                                    | `id`, `name`                     |
| Start / duration | clip `data-start-frame` (default `0`), `data-duration-frames` (default `1`, warning)       | `startFrame`, `durationInFrames` |
| Generic clip     | class `hf-clip`                                                                            | kind `sequence`                  |
| Kind clips       | classes `hf-video`, `hf-audio`, `hf-image`, `hf-text`                                      | matching kinds                   |
| Media reference  | `data-src` (preferred) or `src`                                                            | `mediaReference`                 |
| Track lane       | container class `hf-track` / attr `data-track-name` (document order), or clip `data-track` | `track` index                    |
| Marker           | class `hf-marker` with `data-frame` (absolute) and `data-name` (or text content)           | `markers[]`                      |

Graceful fallbacks:

- Unknown elements inside the composition root become `<Sequence>`
  placeholders (kind `sequence`, named `Sequence: <tag>`) and produce a
  warning. Their `data-*` timing attributes are still honored.
- Missing/invalid timing values fall back to defaults with a warning.
- Markers without a valid `data-frame` are skipped with a warning.
- Void elements (`br`, `img`, `source`, …) and document-level tags (`html`,
  `head`, `body`, `title`, `meta`, `link`, `base`, `style`, `script`) are
  ignored, never placeholdered.
- Without a composition root the document imports with defaults and a warning.

Import result: `{ composition, warnings }` — `warnings` is a list of
human-readable strings; import itself never throws on malformed input.

Nested clips are flattened into the timeline; text content, styles and
visual attributes are out of scope for the timing-level IR.

## BF-231 — Exporters

| Exporter                       | Format                                         | Notes                                                                                                     |
| ------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `exportOtio` / `parseOtio`     | OpenTimelineIO JSON (`OTIO_SCHEMA` Timeline.1) | timeline positions as sequential items with Gap fillers; BrandlyFrames fields in `metadata.brandlyframes` |
| `exportEdl` / `parseEdl`       | CMX3600 text                                   | chronologically ordered cut events, `V`/`A` channels, `* FROM CLIP NAME:` comments                        |
| `exportFcpXml` / `parseFcpXml` | FCP7-style xmeml v4                            | video clips under `<video>`, audio under `<audio>`, sequence-level `<marker>`                             |

All exporters validate the IR first (`validateComposition`) and throw a
descriptive `Error` on violations. Each format has a parser validated by
round-trip tests of our own exports (`parseOtio`, `parseEdl`, `parseFcpXml`).
The parsers are round-trip-grade, not general-purpose NLE-file readers:
foreign documents with transitions, effects or nested structures are outside
this contract.

### Lossy fields by format

| Field                                | OTIO JSON                            | CMX3600 EDL                                     | FCP XML                                                             |
| ------------------------------------ | ------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------- |
| Clip names                           | lossless                             | lossless (via comments)                         | lossless                                                            |
| Timing (start/duration)              | lossless                             | lossless                                        | lossless                                                            |
| Frame rate                           | lossless                             | **lost** (parser default 30; pass explicit fps) | rounded to integer timebase                                         |
| Geometry (width/height)              | lossless (metadata)                  | **lost** (defaults 1920×1080)                   | lossless                                                            |
| Composition id/name                  | lossless (metadata/name)             | name only                                       | lossless                                                            |
| Track names                          | lossless                             | **lost** (become `V1`/`A1`)                     | **lost** (become `Track N`)                                         |
| Clip sub-kinds (image/text/sequence) | lossless (metadata)                  | **lost** (become `video`)                       | **lost** (non-audio → `video`)                                      |
| Media references                     | lossless (`target_url`)              | **lost**                                        | lossless (`pathurl`; relative paths get `file://localhost/` prefix) |
| Markers                              | lossless (stack markers)             | **lost** (not representable)                    | lossless (sequence markers)                                         |
| Same-track overlaps                  | not representable (sequential model) | not representable                               | not representable (per-track ordering)                              |
| Empty tracks                         | lossless                             | **lost**                                        | **lost**                                                            |
| Text content / styles                | out of IR scope                      | out of IR scope                                 | out of IR scope                                                     |

## Testing

```bash
pnpm --filter @brandlyframes/interop... build
pnpm --filter @brandlyframes/interop test
```

Fixtures live in `test/fixtures/` (committed, offline).
