import { describe, it, expect } from 'vitest';
import { render } from '../src/index';

describe('Renderer', () => {
  it('should export a render function', () => {
    expect(typeof render).toBe('function');
  });

  it('should return a promise that resolves to a string (dummy implementation)', async () => {
    const result = await render('test-composition', 0);
    expect(typeof result).toBe('string');
  });
});