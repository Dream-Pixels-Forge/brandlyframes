/**
 * Pure timing math for the BrandlyFrames timeline engine.
 * Every frame computation used by the timeline components lives here as a
 * total, deterministic function with no React, DOM or wall-clock dependency.
 */
export { isSequenceVisible, resolveSequenceFrame } from './sequence-frames';
export { computeSeriesStarts, totalSeriesDuration } from './series-frames';
export { isLoopActive, resolveLoopFrame } from './loop-frames';
export { resolveFreezeFrame, type FreezeFrameOverride } from './freeze-frames';
export {
  formatInvalidValue,
  validateFrame,
  validateLayout,
  validatePositiveInteger,
  validateVideoConfig,
} from './validate-frame-inputs';
