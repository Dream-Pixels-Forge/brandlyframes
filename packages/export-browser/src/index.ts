/**
 * @brandlyframes/export-browser — Browser-side export via WebCodecs [BF-201].
 *
 * Exports encoded media client-side (no server). The pure muxers
 * (`muxMp4`, `muxWebm`) are testable in Node; the export functions require
 * a browser with WebCodecs and throw a clear error otherwise.
 */

export { muxMp4 } from './mp4-muxer.js';
export { muxWebm } from './webm-muxer.js';
export type { Mp4Options } from './mp4-muxer.js';
export type { WebmOptions } from './webm-muxer.js';
export {
  exportVideoBrowser,
  exportAudioBrowser,
  type ExportVideoOptions,
  type ExportAudioOptions,
  type ExportResult,
} from './export-browser.js';
