/**
 * @brandlyframes/interop — composition interop for BrandlyFrames.
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
