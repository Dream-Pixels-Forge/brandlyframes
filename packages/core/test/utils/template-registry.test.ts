/**
 * Template registry (BF-302 marketplace + BF-481 template gallery):
 * register/get/list/clear, versioned payloads.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  clearTemplates,
  getTemplate,
  listTemplates,
  registerTemplate,
} from '../../src/utils';

describe('template registry (BF-302/BF-481)', () => {
  afterEach(() => {
    clearTemplates();
  });

  it('registers and returns a template by name', () => {
    const template = { name: 'hero', version: '1.0.0', payload: { layout: 'bento' } };
    registerTemplate('hero', template);
    expect(getTemplate('hero')).toBe(template);
    expect(getTemplate('missing')).toBeUndefined();
  });

  it('re-registration overwrites', () => {
    registerTemplate('t', { name: 't', version: '1', payload: 'a' });
    registerTemplate('t', { name: 't', version: '2', payload: 'b' });
    expect(getTemplate('t')?.version).toBe('2');
    expect(getTemplate('t')?.payload).toBe('b');
  });

  it('lists all registered template names', () => {
    registerTemplate('a', { name: 'a', version: '1', payload: {} });
    registerTemplate('b', { name: 'b', version: '1', payload: {} });
    expect([...listTemplates()].sort()).toEqual(['a', 'b']);
  });

  it('clearTemplates empties the registry', () => {
    registerTemplate('a', { name: 'a', version: '1', payload: {} });
    clearTemplates();
    expect(listTemplates()).toEqual([]);
    expect(getTemplate('a')).toBeUndefined();
  });
});
