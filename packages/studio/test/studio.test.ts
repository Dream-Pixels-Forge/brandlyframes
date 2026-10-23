import { describe, it, expect } from 'vitest';
import { StudioShell, PropsEditor, ErrorOverlay, FrameInspector, CacheCounters } from '../src/index';

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
    const _onChange = () => {}; // Simple mock function
    expect(PropsEditor({ schema, _onChange })).toBeDefined();
    expect(PropsEditor({ schema, _initialData: { name: 'test' }, _onChange })).toBeDefined();
  });
});

describe('ErrorOverlay', () => {
  it('should be defined', () => {
    expect(ErrorOverlay).toBeDefined();
  });

  it('should be a function', () => {
    expect(typeof ErrorOverlay).toBe('function');
  });

  it('should return null when no error is provided', () => {
    expect(ErrorOverlay({ error: undefined, frameNumber: 0, componentStack: '' })).toBeNull();
  });

  it('should render error information when error is provided', () => {
    const error = new Error('Test error');
    const result = ErrorOverlay({ 
      error, 
      frameNumber: 42, 
      componentStack: 'TestComponent', 
      suggestedFix: 'Check props' 
    });
    expect(result).toBeDefined();
    // Note: We're not doing full rendering tests here, just checking the function returns something
  });
});

describe('CacheCounters', () => {
  it('should be defined', () => {
    expect(CacheCounters).toBeDefined();
  });

  it('should be a function', () => {
    expect(typeof CacheCounters).toBe('function');
  });

  it('should accept hit/miss stats props [BF-112]', () => {
    const element = CacheCounters({ stats: { hits: 3, misses: 1, hitRate: 0.75 } });
    expect(element).toBeDefined();
  });
});

describe('FrameInspector', () => {
  it('should be defined', () => {
    expect(FrameInspector).toBeDefined();
  });

  it('should be a function', () => {
    expect(typeof FrameInspector).toBe('function');
  });

  it('should return null when no element is provided', () => {
    expect(FrameInspector({ 
      element: null, 
      frameNumber: 0, 
      computedProps: {}, 
      computedStyles: {} 
    })).toBeNull();
  });

  it('should accept element, frameNumber, computedProps, and computedStyles props', () => {
    const mockElement = { tagName: 'DIV' } as Element;
    expect(FrameInspector({ 
      element: mockElement, 
      frameNumber: 0, 
      computedProps: {}, 
      computedStyles: {} 
    })).toBeDefined();
  });
});