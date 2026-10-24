/**
 * Animation adapters for the BF-420 Determinism Guard.
 *
 * When the virtual clock is active, CSS animations/transitions and any
 * library-driven motion must be paused and seeked to the current frame so
 * renders stay deterministic (`frame -> pixels`). Adapters are registered by
 * name (e.g. 'css', 'gsap', 'lottie', 'framer-motion', 'tailwind') and
 * applied to elements via pauseAllAnimations / seekAllAnimations /
 * resumeAllAnimations.
 *
 * Core stays DOM-free: elements are duck-typed (`{ style }`), so a real
 * HTMLElement works at runtime and a plain object works in tests. This
 * package ships the built-in 'css' adapter; consumers register adapters for
 * third-party libraries (GSAP, Lottie, Framer Motion, Tailwind animate-*).
 */

export interface AnimationElement {
  readonly style: Record<string, string>;
}

export interface AnimationAdapter {
  readonly name: string;
  pause(el: AnimationElement): void;
  seek(el: AnimationElement, frame: number, fps: number): void;
  resume(el: AnimationElement): void;
  release(el: AnimationElement): void;
}

const adapters = new Map<string, AnimationAdapter>();
/** Elements currently paused, keyed to the adapter that paused them. */
const paused = new WeakMap<AnimationElement, AnimationAdapter>();

/** Built-in CSS adapter name. */
export const CSS_ADAPTER_NAME = 'css';

/** Milliseconds for a frame offset at `fps`. */
function frameToMs(frame: number, fps: number): number {
  return (frame / fps) * 1000;
}

/** Register an animation adapter by name. Re-registering overwrites. */
export function registerAnimationAdapter(adapter: AnimationAdapter): void {
  adapters.set(adapter.name, adapter);
}

/** Look up a registered adapter by name. */
export function getAnimationAdapter(name: string): AnimationAdapter | undefined {
  return adapters.get(name);
}

/** Remove a registered adapter by name. Does not resume paused elements. */
export function unregisterAnimationAdapter(name: string): void {
  adapters.delete(name);
}

function msDelay(frame: number, fps: number): string {
  return `${-frameToMs(frame, fps)}ms`;
}

/**
 * Built-in CSS animation/transition adapter. Pauses playback via
 * `animation-play-state` and seeks by applying a negative
 * `animation-delay`/`transition-delay` so the rendered frame matches
 * `frame / fps`. Best-effort: complex multi-iteration animations approximate.
 */
export function createCssAnimationAdapter(): AnimationAdapter {
  return {
    name: CSS_ADAPTER_NAME,
    pause(el: AnimationElement): void {
      el.style.animationPlayState = 'paused';
    },
    seek(el: AnimationElement, frame: number, fps: number): void {
      el.style.animationDelay = msDelay(frame, fps);
      el.style.transitionDelay = msDelay(frame, fps);
    },
    resume(el: AnimationElement): void {
      el.style.animationPlayState = 'running';
      el.style.animationDelay = '';
      el.style.transitionDelay = '';
    },
    release(el: AnimationElement): void {
      this.resume(el);
    },
  };
}

/**
 * Pause every element using `adapterName` (defaults to the built-in 'css'
 * adapter). Each paused element is remembered so seek/resume route to the
 * same adapter. Elements are skipped when no adapter resolves.
 */
export function pauseAllAnimations(
  elements: readonly AnimationElement[],
  adapterName: string = CSS_ADAPTER_NAME,
): void {
  const adapter = getAnimationAdapter(adapterName);
  if (!adapter) return;
  for (const el of elements) {
    adapter.pause(el);
    paused.set(el, adapter);
  }
}

/** Seek every paused element to `frame` (fps drives ms conversion). */
export function seekAllAnimations(
  elements: readonly AnimationElement[],
  frame: number,
  fps: number,
): void {
  for (const el of elements) {
    const adapter = paused.get(el);
    if (!adapter) continue;
    adapter.seek(el, frame, fps);
  }
}

/** Resume every paused element and clear the paused registry. */
export function resumeAllAnimations(elements: readonly AnimationElement[]): void {
  for (const el of elements) {
    const adapter = paused.get(el);
    if (!adapter) continue;
    adapter.resume(el);
    paused.delete(el);
  }
}
