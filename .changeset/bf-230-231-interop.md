---
'@brandlyframes/interop': minor
---

feat: HyperFrames HTML import + OTIO/EDL/FCP XML export [BF-230][BF-231]

- `parseHyperFramesHtml` (BF-230): parse HyperFrames composition documents
  into BrandlyFrames composition IR — data-* timing attributes
  (`data-start-frame`, `data-duration-frames`, `data-track`), clip classes
  (`hf-clip`, `hf-video`, `hf-audio`, `hf-image`, `hf-text`), track
  containers (`hf-track`/`data-track-name`), markers (`hf-marker`), and
  composition config (`data-fps`/`data-width`/`data-height`/
  `data-duration-frames`). Unknown nodes become `<Sequence>` placeholders
  with warnings; malformed HTML never throws.
- `exportOtio`/`parseOtio` (BF-231): OpenTimelineIO JSON with Gap fillers
  and `metadata.brandlyframes` — lossless round trip of our own exports.
- `exportEdl`/`parseEdl` (BF-231): CMX3600 EDL with V/A cut events and
  `* FROM CLIP NAME:` comments; documented-lossy (no markers/media/track
  names, fps supplied at parse time).
- `exportFcpXml`/`parseFcpXml` (BF-231): xmeml v4 with clipitem in/out/
  start/end, pathurl media references and sequence markers; documented
  lossy fields in the package README.
- Composition IR types (`CompositionIR`, `TimelineClip`, `TimelineTrack`,
  `TimelineMarker`) and `validateComposition`; the placeholder stub API
  was replaced (no consumers). Package is now dependency-free.
