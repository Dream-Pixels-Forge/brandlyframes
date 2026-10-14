/**
 * `getInputProps()` — reads the composition's input props (BF-006).
 *
 * The props object is injectable: the render bootstrap (CLI/Studio/Player)
 * calls `setInputProps()` once before rendering, and composition code reads
 * it back with `getInputProps()`. Pure module — no React, no DOM.
 */

let inputProps: Record<string, unknown> = {};

/** Renders a received value for inclusion in a validation error message. */
const formatReceived = (value: unknown): string => {
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return 'an array';
  return `${typeof value} (${String(value)})`;
};

/**
 * The input props passed to the current render, merged by the caller of
 * `setInputProps()` (usually `{...defaultProps, ...inputProps}` handling
 * happens per-composition; this is the raw injected object). Returns the
 * same object until re-injected.
 */
export const getInputProps = (): Record<string, unknown> => inputProps;

/**
 * Injects the input props for the current render (the runtime bootstrap's
 * entry point for CLI/Studio/Player input). `undefined` resets to an empty
 * object. Throws a helpful error for non-object values.
 */
export const setInputProps = (props: Record<string, unknown> | undefined): void => {
  if (props === undefined) {
    inputProps = {};
    return;
  }
  if (typeof props !== 'object' || props === null || Array.isArray(props)) {
    throw new Error(
      `setInputProps(): input props must be a plain object (like { title: "Hello" }), but got ${formatReceived(
        props,
      )}.`,
    );
  }
  inputProps = props;
};
