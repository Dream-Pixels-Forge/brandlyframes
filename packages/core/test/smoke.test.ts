import { describe, expect, it } from 'vitest';
import { BRANDLYFRAMES_VERSION } from '../src/index';

describe('brandlyframes package', () => {
  it('exposes the package version string', () => {
    expect(BRANDLYFRAMES_VERSION).toBe('0.1.0');
  });
});
