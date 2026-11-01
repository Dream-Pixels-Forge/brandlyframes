import '@testing-library/jest-dom/vitest';

// Extend Vitest's Assertion interface with jest-dom matchers.
// Signature must match vitest's Assertion<R, T> exactly (two type params)
// to avoid TS2428; jest-dom's /vitest types use a single type param and
// are intentionally not activated here.
declare module 'vitest' {
  interface Assertion<R extends void | Promise<void> = void, T = unknown> {
    toBeInTheDocument(this: Assertion<R, T>): R;
    toHaveStyle(css: Record<string, string | number>): R;
    toHaveTextContent(text: string | RegExp): R;
    toHaveAttribute(name: string, value?: string): R;
    toBeVisible(): R;
    toBeDisabled(): R;
    toBeEnabled(): R;
    toBeChecked(): R;
    toHaveValue(value: string | string[] | number): R;
    toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
    toBeEmptyDOMElement(): R;
    toHaveClass(...classNames: string[]): R;
    toHaveFocus(): R;
    toHaveFormValues(values: Record<string, unknown>): R;
  }
}
