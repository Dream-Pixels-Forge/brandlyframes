/**
 * Framework-free utilities — no React, no DOM (safe in render workers and
 * Node): input props bootstrap, static asset paths, seeded randomness
 * (BF-400) and time helpers (BF-401).
 */
export { getInputProps, setInputProps } from './input-props';
export { random, randomInt, randomPick, type RandomSeed } from './random';
export { staticFile } from './static-file';
export { watchStaticFile } from './watch-static-file';
export { MediaCache } from './media-cache';
export { ms, sec, tc } from './time-helpers';
export {
  registerPlugin,
  getPlugin,
  listPlugins,
  clearPlugins,
  type Plugin,
} from '../plugins';
export {
  registerTemplate,
  getTemplate,
  listTemplates,
  clearTemplates,
  type Template,
} from '../template-registry';
export {
  startFrameProfile,
  endFrameProfile,
  getFrameProfile,
  clearFrameProfile,
  type FrameProfileEntry,
} from './frame-profiler';
export {
  analyzeLoudness,
  detectClipping,
  checkAVDrift,
  type LoudnessAnalysis,
  type ClippingReport,
  type AvDriftReport,
} from './loudness';
export { fetchAutoHold } from './fetch-hold';
