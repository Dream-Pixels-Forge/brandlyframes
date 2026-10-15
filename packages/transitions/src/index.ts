/**
 * @brandlyframes/transitions — frame-exact transition components [BF-070]
 *
 * Provides deterministic, frame-accurate transitions for BrandlyFrames compositions.
 * All transitions derive their progress from the current frame number.
 *
 * Clean-room implementation.
 */

// Types
export {
  createProgress,
  type TransitionProgress,
  type TransitionProgress as TransitionProgressType,
  type EasingFn,
  type TransitionBaseProps,
  type TransitionComponent,
  type TransitionDirection,
  type TransitionVariantConfig,
} from './types';

// Easing functions (re-exported from types)
export { linear, easeIn, easeOut, easeInOut } from './types';

// Transitions
export { Crossfade, crossfadeVariant, type CrossfadeProps } from './crossfade';
export { Slide, slideVariants, type SlideProps, type SlideDirection } from './slide';
export { Wipe, wipeVariants, type WipeProps, type WipeDirection } from './wipe';

// Transition registry for dynamic lookup
import { Crossfade, crossfadeVariant } from './crossfade';
import { Slide, slideVariants } from './slide';
import { Wipe, wipeVariants } from './wipe';
import type { TransitionVariantConfig } from './types';

export const TRANSITION_VARIANTS: ReadonlyArray<TransitionVariantConfig> = [
  crossfadeVariant,
  ...Object.values(slideVariants),
  ...Object.values(wipeVariants),
];

/**
 * Look up a transition variant by ID.
 */
export function getTransitionVariant(id: string): TransitionVariantConfig | undefined {
  return TRANSITION_VARIANTS.find((v) => v.id === id);
}

/**
 * Get all available transition variant IDs.
 */
export function getTransitionVariantIds(): readonly string[] {
  return TRANSITION_VARIANTS.map((v) => v.id);
}