/**
 * Composition registry (BF-002) + Zod props validation (BF-008): declare
 * compositions with `<Composition>`, validate them with
 * `resolveCompositionMetadata`. No rendering, no DOM.
 */
export { Composition } from './Composition';
export {
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
} from './composition-registry';
export {
  resolveCompositionMetadata,
  type ResolvedCompositionMetadata,
} from './resolve-metadata';
