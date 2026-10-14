import { describe, it, expect } from 'vitest';
import { StudioShell } from '../src/index';

describe('StudioShell', () => {
  it('should be defined', () => {
    expect(StudioShell).toBeDefined();
  });

  it('should be a function', () => {
    expect(typeof StudioShell).toBe('function');
  });
});