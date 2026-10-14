/**
 * Animation utilities for BrandlyFrames — pure TypeScript, zero React or
 * DOM imports (safe to use in render workers and Node).
 */
export { Easing, type EasingCollection, type EasingFunction } from './easing';
export { interpolate, type ExtrapolateType, type InterpolateOptions } from './interpolate';
export { interpolateColors } from './interpolate-colors';
export { spring, type SpringConfig, type SpringProps } from './spring';
