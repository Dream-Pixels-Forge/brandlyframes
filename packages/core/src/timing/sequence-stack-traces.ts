/**
 * Pure utilities for tracing through nested `<Sequence>` scopes so render
 * errors name the enclosing sequence(s) and frame. No React, no DOM, no
 * wall-clock — deterministic for the same inputs.
 */

/** A single scope in a sequence stack trace: outermost first, innermost last. */
export type SequenceScope = {
  /** Human-readable name of the sequence (e.g. 'Intro', 'Logo'). */
  readonly name: string;
  /** First frame of the sequence within its parent timeline. */
  readonly from: number;
  /** Number of frames the sequence spans. Positive integer. */
  readonly durationInFrames: number;
};

/** The last (innermost) frame covered by a sequence scope. */
const scopeEnd = (scope: SequenceScope): number => scope.from + scope.durationInFrames - 1;

/**
 * Formats a sequence stack trace from the active scopes (outermost first,
 * innermost last) and an optional current frame. Empty scopes yield a
 * helpful message naming the absence of any sequence context.
 */
export const formatSequenceTrace = (
  scopes: readonly SequenceScope[],
  currentFrame?: number,
): string => {
  if (scopes.length === 0) {
    return currentFrame === undefined
      ? 'no active sequence'
      : `no active sequence at frame ${String(currentFrame)}`;
  }
  const parts = scopes.map(
    (scope) =>
      `Sequence '${scope.name}' (frames ${String(scope.from)}-${String(scopeEnd(scope))})`,
  );
  let trace = parts.join(' → ');
  if (currentFrame !== undefined) {
    trace += ` at frame ${String(currentFrame)}`;
  }
  return trace;
};
