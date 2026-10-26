/**
 * @brandlyframes/test — visual regression testing [BF-240]
 *
 * Golden-frame diff for BrandlyFrames compositions: render designated
 * compositions at pinned frames through an injected capture seam, diff
 * against golden images stored next to the composition, and produce
 * readable text/markdown reports. The CLI (`brandlyframes test`) and the
 * reusable GitHub Action (action.yml) wire the real renderer.
 */

export {
  formatGoldenReport,
  formatGoldenReportMarkdown,
  goldenFilePath,
  goldenFrameDiff,
  runGoldenTests,
  type CaptureFn,
  type DiffResult,
  type GoldenFrameResult,
  type GoldenFrameStatus,
  type GoldenTestEntry,
  type GoldenTestOptions,
  type GoldenTestReport,
} from './golden.js';
export { decodePng, encodePng, type DecodedPng } from './png.js';
