/**
 * @brandlyframes/interop — composition interop for BrandlyFrames.
 *
 * BF-230: import HyperFrames HTML composition documents (data-* timing
 * attributes, clip classes) into BrandlyFrames composition IR, with
 * graceful `<Sequence>` placeholders and warnings for unknown nodes.
 *
 * BF-231: export composition timelines to OpenTimelineIO JSON, CMX3600
 * EDL and FCP XML (xmeml v4), each with a round-trip parser for our own
 * exports. Lossy fields are documented per format in the package README.
 *
 * Strictly typed: the public API contains no `any`.
 */

export {
  type CompositionIR,
  type TimelineClip,
  type TimelineClipKind,
  type TimelineMarker,
  type TimelineTrack,
  validateComposition,
} from './ir.js';
export { parseHyperFramesHtml, type HyperFramesImportResult } from './hyperframes.js';
export { exportOtio, parseOtio } from './otio.js';
export { exportEdl, parseEdl } from './edl.js';
export { exportFcpXml, parseFcpXml } from './fcpxml.js';
