/**
 * Composition metadata resolution (BF-002 + BF-008): merges defaultProps
 * with input props, validates against the Zod schema, runs the async-aware
 * `calculateMetadata` and applies its overrides. Pure module — no rendering,
 * no DOM.
 */

import type { RegisteredComposition } from './composition-registry';
import { assertValidCompositionValues, validateCompositionProps } from './composition-registry';
import type {
  CalculateMetadataContext,
  CompositionConfig,
  CompositionMetadataOverride,
} from './composition-registry';

/** Fully resolved composition metadata — what the renderer/Player mount. */
export type ResolvedCompositionMetadata<Props extends object = Record<string, unknown>> = {
  readonly id: string;
  readonly component: RegisteredComposition['component'];
  readonly durationInFrames: number;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  /** Effective props: `{...defaultProps, ...inputProps}`, possibly replaced by `calculateMetadata`. */
  readonly props: Props;
  /** Named markers for `useMarker` (BF-401); empty when none are declared. */
  readonly markers: Readonly<Record<string, number>>;
};

/**
 * Validates marker values: every marker must map to a non-negative integer
 * frame. Throws a helpful error naming the marker.
 */
const assertValidMarkers = (
  markers: Readonly<Record<string, number>>,
  compositionId: string,
): void => {
  for (const [name, frame] of Object.entries(markers)) {
    if (!Number.isInteger(frame) || frame < 0) {
      throw new Error(
        `Invalid composition metadata for "${compositionId}": marker "${name}" must be a non-negative integer frame, but got ${String(
          frame,
        )}.`,
      );
    }
  }
};

/**
 * Resolves a composition's metadata:
 *
 * 1. Merges `defaultProps` with `inputProps` (input props win per key).
 * 2. Validates the merged props against the Zod `schema` (BF-008) with a
 *    helpful, composition-id-tagged error.
 * 3. Runs `calculateMetadata` (awaited — sync returns and `Promise`s both
 *    work) and applies its `durationInFrames`/`fps`/`width`/`height`/`props`/
 *    `markers` overrides. A `props` override **replaces** the merged props
 *    and is schema-validated as well.
 * 4. Validates every resolved value, including overrides and markers.
 */
export const resolveCompositionMetadata = async <
  Props extends object = Record<string, unknown>,
>(
  composition: CompositionConfig<Props>,
  inputProps?: Partial<Props>,
): Promise<ResolvedCompositionMetadata<Props>> => {
  const mergedProps = {
    ...composition.defaultProps,
    ...inputProps,
  } as Props;

  if (composition.schema) {
    validateCompositionProps(
      composition.schema,
      mergedProps as Record<string, unknown>,
      composition.id,
    );
  }

  const context: CalculateMetadataContext = { compositionId: composition.id };
  const override: CompositionMetadataOverride<unknown> = composition.calculateMetadata
    ? await composition.calculateMetadata(mergedProps, context)
    : {};

  // Screens every present numeric field (durationInFrames/fps/width/height).
  assertValidCompositionValues(override, composition.id);
  if (override.props !== undefined) {
    if (typeof override.props !== 'object' || override.props === null) {
      throw new Error(
        `Invalid composition metadata for "${composition.id}": props override must be an object.`,
      );
    }
    if (composition.schema) {
      validateCompositionProps(composition.schema, override.props, composition.id);
    }
  }
  if (override.markers !== undefined) {
    assertValidMarkers(override.markers, composition.id);
  }

  return {
    id: composition.id,
    component: composition.component,
    durationInFrames: override.durationInFrames ?? composition.durationInFrames,
    fps: override.fps ?? composition.fps,
    width: override.width ?? composition.width,
    height: override.height ?? composition.height,
    props: (override.props ?? mergedProps) as Props,
    markers: override.markers ?? {},
  };
};
