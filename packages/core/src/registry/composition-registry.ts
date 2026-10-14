/**
 * Composition registry (BF-002) — the declarative source of truth for every
 * renderable composition: id, component, duration, fps, dimensions,
 * defaultProps, Zod `schema` (BF-008) and `calculateMetadata`. No rendering,
 * no DOM — the Studio, Player and renderer read compositions from here.
 */

import type { FC } from 'react';
import { z } from 'zod';

/** A React component that renders one composition. */
export type CompositionComponent<Props extends object = Record<string, unknown>> = FC<Props>;

/** Zod schema constraining a composition's props (BF-008). */
export type CompositionSchema<Props extends object = Record<string, unknown>> = z.ZodType<Props>;

/** Context passed to `calculateMetadata`. */
export type CalculateMetadataContext = {
  /** The id of the composition being resolved. */
  readonly compositionId: string;
};

/**
 * Partial metadata a `calculateMetadata` function may override: duration,
 * fps, dimensions, the props themselves (`props` replaces the merged props)
 * and named markers for `useMarker` (BF-401).
 */
export type CompositionMetadataOverride<Props = unknown> = {
  durationInFrames?: number;
  fps?: number;
  width?: number;
  height?: number;
  props?: Props;
  markers?: Readonly<Record<string, number>>;
};

/**
 * Derives dynamic metadata from (validated) props. May return a plain object
 * or a `Promise` — e.g. `async () => ({ durationInFrames: measured })`.
 */
export type CalculateMetadataFunction<Props extends object = Record<string, unknown>> = (
  props: Props,
  context: CalculateMetadataContext,
) => CompositionMetadataOverride<Props> | Promise<CompositionMetadataOverride<Props>>;

/**
 * Author-facing declaration of a composition — also the props type of the
 * `<Composition>` component.
 */
export type CompositionConfig<Props extends object = Record<string, unknown>> = {
  /** Unique composition id (e.g. `"hero"`). */
  readonly id: string;
  /** The component that renders this composition. */
  readonly component: CompositionComponent<Props>;
  /** Total number of frames. Positive integer. */
  readonly durationInFrames: number;
  /** Frames per second. Positive number (fractional fps such as 29.97 is allowed). */
  readonly fps: number;
  /** Composition width in pixels. Positive integer. */
  readonly width: number;
  /** Composition height in pixels. Positive integer. */
  readonly height: number;
  /** Props used when no input props are provided. */
  readonly defaultProps?: Props;
  /** Zod schema the effective props must satisfy (BF-008). */
  readonly schema?: CompositionSchema<Props>;
  /** Async-aware metadata derivation overriding duration/props/etc. */
  readonly calculateMetadata?: CalculateMetadataFunction<Props>;
};

/** Erased `calculateMetadata` stored in the registry (props type erased). */
export type RegisteredCalculateMetadata = (
  props: never,
  context: CalculateMetadataContext,
) => CompositionMetadataOverride<unknown> | Promise<CompositionMetadataOverride<unknown>>;

/**
 * A composition as stored in the registry: the props type is erased
 * (`component` takes `never`-props, `defaultProps` is `unknown`), so
 * heterogeneous compositions share one list. Consumers that render a
 * composition cast the component back to its concrete props type.
 */
export type RegisteredComposition = {
  readonly id: string;
  readonly component: FC<never>;
  readonly durationInFrames: number;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly defaultProps?: unknown;
  readonly schema?: z.ZodType<unknown>;
  readonly calculateMetadata?: RegisteredCalculateMetadata;
};

/**
 * Renders an invalid value for inclusion in a validation error message.
 */
const formatReceived = (value: unknown): string => {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'function') return 'a function';
  return `${typeof value} (${String(value)})`;
};

/**
 * Validates composition numeric metadata: `fps` must be a positive finite
 * number (fractional fps allowed); `durationInFrames`, `width` and `height`
 * must be positive integers. Only checks the fields that are present, so the
 * same validator screens both full registrations and partial
 * `calculateMetadata` overrides. Throws a helpful error.
 */
export const assertValidCompositionValues = (
  values: {
    durationInFrames?: number;
    fps?: number;
    width?: number;
    height?: number;
  },
  compositionId?: string,
): void => {
  const prefix = `Invalid composition metadata${compositionId ? ` for "${compositionId}"` : ''}:`;
  if (
    values.fps !== undefined &&
    (typeof values.fps !== 'number' || !Number.isFinite(values.fps) || values.fps <= 0)
  ) {
    throw new Error(`${prefix} fps must be a positive number, but got ${String(values.fps)}.`);
  }
  if (
    values.durationInFrames !== undefined &&
    (!Number.isInteger(values.durationInFrames) || values.durationInFrames <= 0)
  ) {
    throw new Error(
      `${prefix} durationInFrames must be a positive integer, but got ${String(values.durationInFrames)}.`,
    );
  }
  for (const dimension of ['width', 'height'] as const) {
    const value = values[dimension];
    if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
      throw new Error(
        `${prefix} ${dimension} must be a positive integer, but got ${String(value)}.`,
      );
    }
  }
};

/**
 * Validates `props` against a composition's Zod schema (BF-008) and throws a
 * helpful error naming the composition and every offending field.
 */
export const validateCompositionProps = (
  schema: z.ZodType<unknown>,
  props: object,
  compositionId: string,
): void => {
  const result = schema.safeParse(props);
  if (!result.success) {
    throw new Error(
      `Invalid props for composition "${compositionId}":\n${z.prettifyError(result.error)}`,
    );
  }
};

const registry = new Map<string, RegisteredComposition>();

/**
 * Whether `candidate` describes the exact same registration as the stored
 * `existing` composition — used to make re-rendering the same
 * `<Composition>` element idempotent (registration happens during render).
 */
const isSameRegistration = (
  existing: RegisteredComposition,
  candidate: RegisteredComposition,
): boolean =>
  existing.component === candidate.component &&
  existing.durationInFrames === candidate.durationInFrames &&
  existing.fps === candidate.fps &&
  existing.width === candidate.width &&
  existing.height === candidate.height &&
  existing.defaultProps === candidate.defaultProps &&
  existing.schema === candidate.schema &&
  existing.calculateMetadata === candidate.calculateMetadata;

/**
 * Validates and registers a composition. Throws a helpful error when the id
 * is empty, the component missing, fps/dimensions/duration invalid, or the
 * defaultProps violate the schema (BF-008). Registering the exact same
 * config again is a no-op; a different config under the same id throws.
 */
export const registerComposition = <Props extends object = Record<string, unknown>>(
  config: CompositionConfig<Props>,
): void => {
  if (typeof config.id !== 'string' || config.id.trim() === '') {
    throw new Error(
      `registerComposition(): id must be a non-empty string, but got ${formatReceived(config.id)}.`,
    );
  }
  if (typeof config.component !== 'function') {
    throw new Error(
      `registerComposition(): component must be a React component function, but got ${formatReceived(
        config.component,
      )}.`,
    );
  }
  if (config.calculateMetadata !== undefined && typeof config.calculateMetadata !== 'function') {
    throw new Error(
      `registerComposition(): calculateMetadata must be a function, but got ${formatReceived(
        config.calculateMetadata,
      )}.`,
    );
  }
  assertValidCompositionValues(config, config.id);
  if (config.schema) {
    validateCompositionProps(config.schema, config.defaultProps ?? {}, config.id);
  }
  const candidate: RegisteredComposition = {
    id: config.id,
    component: config.component,
    durationInFrames: config.durationInFrames,
    fps: config.fps,
    width: config.width,
    height: config.height,
    defaultProps: config.defaultProps,
    schema: config.schema,
    calculateMetadata: config.calculateMetadata,
  };
  const existing = registry.get(config.id);
  if (existing) {
    if (isSameRegistration(existing, candidate)) {
      return;
    }
    throw new Error(
      `registerComposition(): the composition id "${config.id}" is already registered. Composition ids must be unique — rename one of the compositions.`,
    );
  }
  registry.set(config.id, candidate);
};

/** All registered compositions, in registration order. */
export const getCompositions = (): readonly RegisteredComposition[] =>
  Array.from(registry.values());

/** Removes a composition by id (no-op when the id is not registered). */
export const unregisterComposition = (id: string): void => {
  registry.delete(id);
};

/** Clears every registered composition (runtime bootstrap / test isolation). */
export const clearCompositions = (): void => {
  registry.clear();
};
