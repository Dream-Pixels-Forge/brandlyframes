import { describe, it, expect } from 'vitest';
import { bundle } from '../src/index';

describe('Bundler', () => {
  it('should export a bundle function', () => {
    expect(typeof bundle).toBe('function');
  });

  it('should return a promise that resolves to an object with code', async () => {
    const result = await bundle({});
    expect(result).toHaveProperty('code');
    expect(typeof result.code).toBe('string');
  });
});