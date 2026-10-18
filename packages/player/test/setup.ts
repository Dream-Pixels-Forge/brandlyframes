import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock requestAnimationFrame for testing
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 16) as unknown as number;
});

global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});

// Mock performance.now
let mockTime = 0;
vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

export const advanceMockTime = (ms: number) => {
  mockTime += ms;
};

// Extend Vitest's Assertion interface with jest-dom matchers
declare module 'vitest' {
  interface Assertion<T = unknown> {
    toBeInTheDocument(): T;
    toHaveStyle(css: Record<string, string | number>): T;
    toHaveTextContent(text: string | RegExp): T;
    toHaveAttribute(name: string, value?: string): T;
    toBeVisible(): T;
    toBeDisabled(): T;
    toBeEnabled(): T;
    toBeChecked(): T;
    toHaveValue(value: string | string[] | number): T;
    toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): T;
    toBeEmptyDOMElement(): T;
    toHaveClass(...classNames: string[]): T;
    toHaveFocus(): T;
    toHaveFormValues(values: Record<string, unknown>): T;
  }
}