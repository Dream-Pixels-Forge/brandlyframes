/**
 * @brandlyframes/transitions — transition types and utilities [BF-070]
 *
 * Clean-room implementation. Provides frame-exact transition components
 * that work with the BrandlyFrames frame-by-frame architecture.
 */

import type { FC, ReactElement } from 'react';

/**
 * Transition progress: 0 = start (from), 1 = end (to)
 */
export type TransitionProgress = number & { readonly __brand: unique symbol };

/** Creates a validated transition progress value. */
export const createProgress = (value: number): TransitionProgress => {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`TransitionProgress must be in [0, 1], got ${value}`);
  }
  return value as TransitionProgress;
};

/**
 * Easing function for transition timing.
 * @param t - normalized time (0 to 1)
 * @returns eased value (0 to 1)
 */
export type EasingFn = (t: number) => number;

/** Linear easing (no easing). */
export const linear: EasingFn = (t) => t;

/** Ease-in (accelerate from zero). */
export const easeIn: EasingFn = (t) => t * t;

/** Ease-out (decelerate to zero). */
export const easeOut: EasingFn = (t) => 1 - (1 - t) * (1 - t);

/** Ease-in-out (accelerate then decelerate). */
export const easeInOut: EasingFn = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/**
 * Base props for all transition components.
 */
export interface TransitionBaseProps {
  /** Duration in frames. */
  durationFrames: number;
  /** Easing function. Default: easeInOut. */
  easing?: EasingFn;
  /** Children: exactly two elements (from, to). */
  children: [ReactElement, ReactElement];
  /** Current frame index. */
  frame: number;
}

/**
 * Result of a transition step.
 */
export interface TransitionStepResult {
  /** Frame index within the transition. */
  frameIndex: number;
  /** Whether the transition is complete. */
  isComplete: boolean;
  /** The composed frame content. */
  content: ReactElement;
}

/**
 * Generic transition component signature.
 */
export type TransitionComponent = FC<TransitionBaseProps>;

/**
 * Transition direction.
 */
export type TransitionDirection = 'forward' | 'reverse';

/**
 * Configuration for transition variants.
 */
export interface TransitionVariantConfig {
  /** Unique identifier for the variant. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Component that implements this transition. */
  component: TransitionComponent;
}