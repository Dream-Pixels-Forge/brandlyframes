import { describe, it, expect } from 'vitest';
import { Studio } from '../src/index.tsx';

describe('Studio', () => {
  it('should be a function', () => {
    expect(typeof Studio).toBe('function');
  });

  it('should return a React element', () => {
    const element = Studio();
    expect(element).toBeTruthy();
    expect(typeof element.props).toBe('object');
  });
});