import { beforeEach, describe, expect, it } from 'vitest';
import type { FC } from 'react';
import {
  clearCompositions,
  getCompositions,
  registerComposition,
  unregisterComposition,
} from '../../src/registry';

const Hero: FC<{ title: string }> = () => null;
const Other: FC<{ title: string }> = () => null;

const baseConfig = {
  id: 'hero',
  component: Hero,
  durationInFrames: 90,
  fps: 30,
  width: 1080,
  height: 1920,
};

describe('composition registry (BF-002)', () => {
  beforeEach(() => {
    clearCompositions();
  });

  it('registers a composition and returns it from getCompositions()', () => {
    registerComposition(baseConfig);
    const compositions = getCompositions();
    expect(compositions).toHaveLength(1);
    expect(compositions[0].id).toBe('hero');
    expect(compositions[0].component).toBe(Hero);
    expect(compositions[0].durationInFrames).toBe(90);
    expect(compositions[0].fps).toBe(30);
    expect(compositions[0].width).toBe(1080);
    expect(compositions[0].height).toBe(1920);
  });

  it('returns compositions in registration order', () => {
    registerComposition(baseConfig);
    registerComposition({ ...baseConfig, id: 'second', component: Other });
    expect(getCompositions().map((c) => c.id)).toEqual(['hero', 'second']);
  });

  it('throws a helpful error on duplicate ids', () => {
    registerComposition(baseConfig);
    expect(() => registerComposition({ ...baseConfig, component: Other })).toThrowError(
      /composition id "hero" is already registered/,
    );
  });

  it('accepts re-registering the exact same config object (idempotent)', () => {
    registerComposition(baseConfig);
    expect(() => registerComposition(baseConfig)).not.toThrow();
    expect(getCompositions()).toHaveLength(1);
  });

  it.each([
    ['fps', { ...baseConfig, fps: 0 }, /fps/],
    ['negative fps', { ...baseConfig, fps: -30 }, /fps/],
    ['NaN fps', { ...baseConfig, fps: Number.NaN }, /fps/],
    ['width zero', { ...baseConfig, width: 0 }, /width/],
    ['negative width', { ...baseConfig, width: -100 }, /width/],
    ['non-integer width', { ...baseConfig, width: 10.5 }, /width/],
    ['height zero', { ...baseConfig, height: 0 }, /height/],
    ['non-integer height', { ...baseConfig, height: 19.2 }, /height/],
    ['duration zero', { ...baseConfig, durationInFrames: 0 }, /durationInFrames/],
    ['negative duration', { ...baseConfig, durationInFrames: -10 }, /durationInFrames/],
    ['non-integer duration', { ...baseConfig, durationInFrames: 90.5 }, /durationInFrames/],
  ] as const)('rejects invalid %s', (_label, config, pattern) => {
    expect(() => registerComposition(config)).toThrowError(pattern);
  });

  it('allows fractional fps such as 29.97', () => {
    expect(() => registerComposition({ ...baseConfig, fps: 29.97 })).not.toThrow();
  });

  it('rejects an empty or non-string id', () => {
    expect(() => registerComposition({ ...baseConfig, id: '' })).toThrowError(/id/);
    expect(() => registerComposition({ ...baseConfig, id: '   ' })).toThrowError(/id/);
  });

  it('rejects a missing component', () => {
    expect(() =>
      registerComposition({ ...baseConfig, component: undefined as unknown as typeof Hero }),
    ).toThrowError(/component/);
  });

  it('unregisterComposition removes a composition and ignores unknown ids', () => {
    registerComposition(baseConfig);
    unregisterComposition('hero');
    expect(getCompositions()).toHaveLength(0);
    expect(() => unregisterComposition('never-registered')).not.toThrow();
  });
});
