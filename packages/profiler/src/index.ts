/**
 * @brandlyframes/profiler — frame profiler [BF-202]
 *
 * Wraps a render path and records per-frame and per-component render timing.
 * Identifies slow frames and slow components, and produces flame-view data
 * for the Studio flame view.
 */

export { FrameProfiler } from './frame-profiler.js';
export type {
  ComponentTiming,
  FlameViewPoint,
  FrameProfilerOptions,
  FrameTiming,
  ProfileResult,
  ProfiledRenderPath,
} from './types.js';
