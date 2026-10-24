/**
 * Plugin registry (BF-301): register/get/list/clear, setup hook invoked once.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  clearPlugins,
  getPlugin,
  listPlugins,
  registerPlugin,
} from '../../src/utils';

describe('plugin registry (BF-301)', () => {
  afterEach(() => {
    clearPlugins();
  });

  it('registers and returns a plugin by name', () => {
    const plugin = { kind: 'effect', setup: () => {} };
    registerPlugin('blur', plugin);
    expect(getPlugin('blur')).toBe(plugin);
    expect(getPlugin('missing')).toBeUndefined();
  });

  it('invokes setup on registration', () => {
    let setupRan = false;
    registerPlugin('fx', { kind: 'effect', setup: () => (setupRan = true) });
    expect(setupRan).toBe(true);
  });

  it('re-registration overwrites', () => {
    registerPlugin('x', { kind: 'a' });
    registerPlugin('x', { kind: 'b' });
    expect(getPlugin('x')?.kind).toBe('b');
  });

  it('lists all registered plugin names', () => {
    registerPlugin('a', { kind: 'a' });
    registerPlugin('b', { kind: 'b' });
    expect([...listPlugins()].sort()).toEqual(['a', 'b']);
  });

  it('clearPlugins empties the registry', () => {
    registerPlugin('a', { kind: 'a' });
    clearPlugins();
    expect(listPlugins()).toEqual([]);
    expect(getPlugin('a')).toBeUndefined();
  });
});
