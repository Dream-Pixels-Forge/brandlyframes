/**
 * BF-411 — Error capture state logic.
 * Records render errors with the failing component name, frame number,
 * props snapshot and a best-effort suggested fix.
 */

export interface CapturedRenderError {
  error: Error;
  componentName: string;
  frame: number;
  propsSnapshot: Record<string, unknown>;
  suggestedFix: string;
  componentStack?: string;
}

export interface RecordErrorInput {
  error: Error;
  frame: number;
  props?: Record<string, unknown>;
  componentStack?: string;
}

/** Best-effort mapping from common React/JS error messages to a suggested fix. */
const FIX_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [
    /cannot read propert(?:y|ies) of (?:undefined|null)/i,
    'A value was undefined/null when reading a property — guard it (optional chaining or defaults) before this frame.',
  ],
  [/is not a function/i, 'A value used as a function is not one at this frame — check the prop or variable type.'],
  [
    /objects are not valid as a react child/i,
    'Render strings, numbers or valid React elements — not plain objects or functions.',
  ],
  [
    /maximum update depth exceeded/i,
    'A render/setState loop — check an effect or render-phase update that re-triggers every frame.',
  ],
  [/invalid hook call/i, 'Hooks may only run inside a component or custom hook — not conditionally or outside render.'],
  [/each child in a list should have a unique "key"/i, 'Add a stable unique `key` prop to each item in the list.'],
];

export function suggestFix(error: Error): string {
  const message = error?.message ?? '';
  for (const [pattern, fix] of FIX_RULES) {
    if (pattern.test(message)) return fix;
  }
  return 'Inspect the failing component and its props at this frame.';
}

/** Best-effort: React component stacks list the failing component first, then JS error stacks. */
export function extractComponentName(error: Error, componentStack?: string): string {
  const fromComponentStack = componentStack?.match(/^\s*at\s+([A-Za-z0-9_$.[\]]+)/m)?.[1];
  if (fromComponentStack) return fromComponentStack;
  const fromErrorStack = error?.stack?.match(/^\s*at\s+([A-Za-z0-9_$]+)/m)?.[1];
  if (fromErrorStack) return fromErrorStack;
  return 'Unknown';
}

export class ErrorCapture {
  private captured: CapturedRenderError[] = [];

  record({ error, frame, props, componentStack }: RecordErrorInput): CapturedRenderError {
    const capturedError: CapturedRenderError = {
      error,
      componentName: extractComponentName(error, componentStack),
      frame,
      propsSnapshot: { ...(props ?? {}) },
      suggestedFix: suggestFix(error),
      ...(componentStack !== undefined ? { componentStack } : {}),
    };
    this.captured.push(capturedError);
    return capturedError;
  }

  get errors(): readonly CapturedRenderError[] {
    return this.captured;
  }

  /** Frame of the first recorded error — target for the time-travel "jump to first error" (BF-241). */
  get firstErrorFrame(): number | null {
    return this.captured[0]?.frame ?? null;
  }

  clear(): void {
    this.captured = [];
  }
}
