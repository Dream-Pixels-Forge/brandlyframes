/**
 * BrandlyFrames core — programmatic video SDK for React.
 *
 * A video is a pure function of the frame number (frame -> pixels): every
 * component below reads {@link useCurrentFrame} (and optionally
 * {@link useVideoConfig}) and renders deterministically for that frame, so
 * rendering frame N always produces the same output.
 *
 * Entry point: call {@link registerRoot} once in your entry file, declare
 * compositions with {@link Composition}, scope time with {@link Sequence},
 * {@link Series}, {@link Loop} and {@link Freeze}, and animate with
 * {@link interpolate}, {@link spring} and {@link interpolateColors}.
 *
 * Strictly typed: the public API contains no `any`.
 */

/**
 * Version of the `brandlyframes` package (mirrors package.json).
 */
export const BRANDLYFRAMES_VERSION = '0.1.0';

/**
 * Pure timing math (BF-003, BF-004): the frame computations behind the
 * timeline components, as total deterministic functions with no React, DOM
 * or wall-clock dependency. Useful for testing layouts and for building
 * custom timeline components on the same math.
 */
export {
  isSequenceVisible,
  resolveSequenceFrame,
  computeSeriesStarts,
  totalSeriesDuration,
  isLoopActive,
  resolveLoopFrame,
  resolveFreezeFrame,
  type FreezeFrameOverride,
  formatInvalidValue,
  validateFrame,
  validateLayout,
  validatePositiveInteger,
  validateVideoConfig,
} from './timing';

/**
 * Frame context (BF-006, context half): the provider that carries the
 * current frame and the video config through the component tree. The
 * timeline components mount it for you; export it for advanced runtimes
 * (Player, Studio, custom scopes).
 */
export {
  FrameContext,
  VideoConfigContext,
  type VideoConfig,
  FrameContextProvider,
  type FrameContextProviderProps,
} from './context';

/**
 * Frame hooks (BF-006, context half): the inputs every visual component
 * needs — the current frame, the composition config and the device pixel
 * ratio. All throw a helpful error when used outside a
 * {@link FrameContextProvider}.
 */
export { useCurrentFrame, useVideoConfig, usePixelDensity } from './hooks';

/**
 * Timeline components (BF-003, BF-004): frame-scoping building blocks.
 * {@link Sequence} offsets and truncates time, {@link Series} lays out
 * children back-to-back, {@link Loop} wraps time, {@link Freeze} pins it,
 * and {@link AbsoluteFill} is the style baseline for every layer.
 */
export {
  Sequence,
  type SequenceLayout,
  type SequenceProps,
  Series,
  type SeriesProps,
  type SeriesSequenceProps,
  Loop,
  type LoopProps,
  Freeze,
  type FreezeProps,
  AbsoluteFill,
  type AbsoluteFillProps,
} from './components';

/**
 * Animation utilities (BF-005): pure TypeScript, zero React or DOM imports
 * (safe in render workers and Node). {@link interpolate} maps values across
 * ranges, {@link Easing} provides easing curves, {@link spring} provides
 * physics-based motion, and {@link interpolateColors} interpolates colors.
 */
export {
  Easing,
  type EasingCollection,
  type EasingFunction,
  interpolate,
  type ExtrapolateType,
  type InterpolateOptions,
  interpolateColors,
  spring,
  type SpringConfig,
  type SpringProps,
} from './animation';

/**
 * Composition registry (BF-002) and Zod props validation (BF-008):
 * declare compositions with {@link Composition}, read them back with
 * {@link getCompositions}, and resolve runtime metadata (async
 * `calculateMetadata` overrides, schema-validated props) with
 * {@link resolveCompositionMetadata}.
 */
export {
  Composition,
  assertValidCompositionValues,
  clearCompositions,
  getCompositions,
  registerComposition,
  unregisterComposition,
  validateCompositionProps,
  type CalculateMetadataContext,
  type CalculateMetadataFunction,
  type CompositionComponent,
  type CompositionConfig,
  type CompositionMetadataOverride,
  type CompositionSchema,
  type RegisteredCalculateMetadata,
  type RegisteredComposition,
  resolveCompositionMetadata,
  type ResolvedCompositionMetadata,
} from './registry';

/**
 * Runtime primitives: the entry-point bootstrap ({@link registerRoot},
 * BF-002), frame-blocking async readiness ({@link holdFrame}/
 * {@link releaseFrame}, BF-006), named composition markers
 * ({@link useMarker}, BF-401) and the frame-driven media primitives
 * {@link Img}, {@link Audio} and {@link Video} (BF-007).
 */
export {
  clearFrameHolds,
  getActiveHolds,
  holdFrame,
  releaseFrame,
  type ActiveFrameHold,
  type FrameHold,
  type HoldFrameOptions,
  Audio,
  type AudioProps,
  Img,
  type ImgProps,
  Video,
  type VideoProps,
  CompositionMarkersProvider,
  MarkerContext,
  useMarker,
  type CompositionMarkers,
  type CompositionMarkersProviderProps,
  getRootComponent,
  registerRoot,
} from './runtime';

/**
 * Framework-free utilities — no React, no DOM (safe in render workers and
 * Node): input props bootstrap, static asset paths, seeded randomness
 * ({@link random}, BF-400) and time helpers ({@link sec}, {@link ms},
 * {@link tc}, BF-401).
 */
export {
  getInputProps,
  setInputProps,
  random,
  type RandomSeed,
  staticFile,
  watchStaticFile,
  ms,
  sec,
  tc,
} from './utils';
