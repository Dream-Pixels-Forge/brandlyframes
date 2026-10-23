import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorCapture, suggestFix, extractComponentName } from '../src/errorCapture';
import type { CapturedRenderError } from '../src/errorCapture';

describe('suggestFix (BF-411 best-effort message mapping)', () => {
  it('maps undefined-property reads to a guard suggestion', () => {
    const error = new Error("Cannot read properties of undefined (reading 'width')");
    expect(suggestFix(error)).toMatch(/optional chaining|guard/i);
  });

  it('maps null-property reads to a guard suggestion', () => {
    const error = new Error('Cannot read properties of null (reading style)');
    expect(suggestFix(error)).toMatch(/optional chaining|guard/i);
  });

  it('maps not-a-function calls', () => {
    expect(suggestFix(new Error('x.foo is not a function'))).toMatch(/not a function|type/i);
  });

  it('maps invalid React children', () => {
    expect(suggestFix(new Error('Objects are not valid as a React child'))).toMatch(/child|element/i);
  });

  it('maps update-depth loops', () => {
    expect(suggestFix(new Error('Maximum update depth exceeded'))).toMatch(/loop|effect/i);
  });

  it('maps invalid hook calls', () => {
    expect(suggestFix(new Error('Invalid hook call'))).toMatch(/hook/i);
  });

  it('returns a generic suggestion for unknown messages', () => {
    expect(suggestFix(new Error('Something completely different happened'))).toMatch(/props|component/i);
  });
});

describe('extractComponentName (BF-411)', () => {
  it('prefers the React component stack (failing component listed first)', () => {
    const error = new Error('boom');
    expect(extractComponentName(error, '\n    at TitleCard\n    at div\n    at Composition')).toBe('TitleCard');
  });

  it('falls back to the JS error stack', () => {
    const error = new Error('boom');
    error.stack = 'Error: boom\n    at renderBadge (src/badge.tsx:10:5)\n    at div';
    expect(extractComponentName(error)).toBe('renderBadge');
  });

  it('returns Unknown when no stack information exists', () => {
    const error = new Error('boom');
    error.stack = undefined;
    expect(extractComponentName(error)).toBe('Unknown');
  });
});

describe('ErrorCapture (BF-411)', () => {
  let capture: ErrorCapture;

  beforeEach(() => {
    capture = new ErrorCapture();
  });

  it('records component name, frame, props snapshot and suggested fix', () => {
    const recorded = capture.record({
      error: new Error("Cannot read properties of undefined (reading 'opacity')"),
      frame: 42,
      props: { title: 'Hello', scale: 2 },
      componentStack: '\n    at TitleCard',
    });

    expect(recorded.componentName).toBe('TitleCard');
    expect(recorded.frame).toBe(42);
    expect(recorded.propsSnapshot).toEqual({ title: 'Hello', scale: 2 });
    expect(recorded.suggestedFix).toMatch(/optional chaining|guard/i);
    expect(recorded.componentStack).toBe('\n    at TitleCard');
  });

  it('defaults missing props to an empty snapshot', () => {
    const error = new Error('boom');
    error.stack = undefined;
    const recorded = capture.record({ error, frame: 0 });
    expect(recorded.propsSnapshot).toEqual({});
    expect(recorded.componentName).toBe('Unknown');
  });

  it('snapshots props (later mutation of source does not leak in)', () => {
    const props = { scale: 1 };
    capture.record({ error: new Error('boom'), frame: 0, props });
    props.scale = 999;
    expect(capture.errors[0].propsSnapshot).toEqual({ scale: 1 });
  });

  it('keeps an ordered error log and reports the first error frame', () => {
    capture.record({ error: new Error('first'), frame: 30 });
    capture.record({ error: new Error('second'), frame: 90 });
    expect(capture.errors).toHaveLength(2);
    expect(capture.firstErrorFrame).toBe(30);
  });

  it('reports null first error frame when no errors recorded', () => {
    expect(capture.firstErrorFrame).toBeNull();
    expect(capture.errors).toHaveLength(0);
  });

  it('clear() resets the log', () => {
    capture.record({ error: new Error('boom'), frame: 5 });
    capture.clear();
    expect(capture.errors).toHaveLength(0);
    expect(capture.firstErrorFrame).toBeNull();
  });

  it('returned record satisfies the CapturedRenderError shape', () => {
    const recorded: CapturedRenderError = capture.record({ error: new Error('boom'), frame: 1 });
    expect(recorded.error).toBeInstanceOf(Error);
  });
});
