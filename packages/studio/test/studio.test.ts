import { describe, it, expect } from 'vitest';
import { StudioShell, PropsEditor } from '../src/index';

describe('StudioShell', () => {
  it('should be defined', () => {
    expect(StudioShell).toBeDefined();
  });

  it('should be a function', () => {
    expect(typeof StudioShell).toBe('function');
  });
});

describe('PropsEditor', () => {
  it('should be defined', () => {
    expect(PropsEditor).toBeDefined();
  });

  it('should be a function', () => {
    expect(typeof PropsEditor).toBe('function');
  });

  it('should accept schema, initialData, and onChange props', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    const onChange = () => {}; // Simple mock function
    expect(PropsEditor({ schema, onChange })).toBeDefined();
    expect(PropsEditor({ schema, initialData: { name: 'test' }, onChange })).toBeDefined();
  });
});