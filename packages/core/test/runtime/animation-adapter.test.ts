/**
 * Animation adapters (BF-420): registry + built-in CSS adapter + pause/seek/
 * resume lifecycle. DOM-free — elements are duck-typed `{ style }`, so tests
 * use plain objects and a real HTMLElement works at runtime.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  CSS_ADAPTER_NAME,
  createCssAnimationAdapter,
  getAnimationAdapter,
  pauseAllAnimations,
  registerAnimationAdapter,
  resumeAllAnimations,
  seekAllAnimations,
  unregisterAnimationAdapter,
} from '../../src/runtime';

describe('animation adapter registry (BF-420)', () => {
  afterEach(() => {
    unregisterAnimationAdapter(CSS_ADAPTER_NAME);
    unregisterAnimationAdapter('custom');
  });

  it('registers and looks up an adapter by name', () => {
    const calls: string[] = [];
    const adapter = {
      name: 'custom',
      pause: () => calls.push('pause'),
      seek: () => calls.push('seek'),
      resume: () => calls.push('resume'),
      release: () => calls.push('release'),
    };
    registerAnimationAdapter(adapter);
    expect(getAnimationAdapter('custom')).toBe(adapter);
    expect(getAnimationAdapter('missing')).toBeUndefined();
  });

  it('unregister removes an adapter', () => {
    registerAnimationAdapter({
      name: 'custom',
      pause: () => {},
      seek: () => {},
      resume: () => {},
      release: () => {},
    });
    unregisterAnimationAdapter('custom');
    expect(getAnimationAdapter('custom')).toBeUndefined();
  });

  it('createCssAnimationAdapter pauses/seeks/resumes/releases an element', () => {
    const style: Record<string, string> = {};
    const el: { style: Record<string, string> } = { style };
    const adapter = createCssAnimationAdapter();

    adapter.pause(el);
    expect(style.animationPlayState).toBe('paused');

    adapter.seek(el, 30, 60); // 500ms -> -500ms delay
    expect(style.animationDelay).toBe('-500ms');
    expect(style.transitionDelay).toBe('-500ms');

    adapter.resume(el);
    expect(style.animationPlayState).toBe('running');
    expect(style.animationDelay).toBe('');
    expect(style.transitionDelay).toBe('');

    adapter.release(el);
    expect(style.animationPlayState).toBe('running');
    expect(style.animationDelay).toBe('');
  });
});

describe('pauseAllAnimations / seekAllAnimations / resumeAllAnimations (BF-420)', () => {
  afterEach(() => {
    unregisterAnimationAdapter(CSS_ADAPTER_NAME);
    unregisterAnimationAdapter('custom');
  });

  it('applies pause/seek/resume to every element via the css adapter', () => {
    registerAnimationAdapter(createCssAnimationAdapter());
    const a: { style: Record<string, string> } = { style: {} };
    const b: { style: Record<string, string> } = { style: {} };

    pauseAllAnimations([a, b]);
    expect(a.style.animationPlayState).toBe('paused');
    expect(b.style.animationPlayState).toBe('paused');

    seekAllAnimations([a, b], 60, 60); // 1s -> -1000ms
    expect(a.style.animationDelay).toBe('-1000ms');
    expect(b.style.transitionDelay).toBe('-1000ms');

    resumeAllAnimations([a, b]);
    expect(a.style.animationPlayState).toBe('running');
    expect(a.style.animationDelay).toBe('');
    expect(b.style.animationDelay).toBe('');
  });

  it('skips elements when no adapter is registered', () => {
    const el: { style: Record<string, string> } = { style: {} };
    expect(() => pauseAllAnimations([el])).not.toThrow();
    expect(() => seekAllAnimations([el], 0, 60)).not.toThrow();
    expect(() => resumeAllAnimations([el])).not.toThrow();
    expect(el.style.animationPlayState).toBeUndefined();
  });

  it('uses the css adapter by default', () => {
    registerAnimationAdapter(createCssAnimationAdapter());
    const el: { style: Record<string, string> } = { style: {} };
    pauseAllAnimations([el]); // defaults to adapterName 'css'
    expect(el.style.animationPlayState).toBe('paused');
  });

  it('remembers which adapter paused each element', () => {
    registerAnimationAdapter(createCssAnimationAdapter()); // css fallback exists
    const customPauseCalls: string[] = [];
    registerAnimationAdapter({
      name: 'custom',
      pause: () => customPauseCalls.push('pause'),
      seek: () => customPauseCalls.push('seek'),
      resume: () => customPauseCalls.push('resume'),
      release: () => customPauseCalls.push('release'),
    });
    const el: { style: Record<string, string> } = { style: {} };
    pauseAllAnimations([el], 'custom'); // explicit adapter wins
    expect(customPauseCalls).toEqual(['pause']);
    // seekAllAnimations routes to the remembered custom adapter, not css.
    seekAllAnimations([el], 10, 60);
    expect(customPauseCalls).toEqual(['pause', 'seek']);
    resumeAllAnimations([el]);
    expect(customPauseCalls).toEqual(['pause', 'seek', 'resume']);
  });
});
