/**
 * Composition markers (BF-401): named frame positions declared through
 * `calculateMetadata` metadata (`markers: { drop: 45 }`) and resolved in
 * component code with `useMarker("drop")` — so no one does frame math by
 * hand.
 */

import { createContext, useContext, type FC, type ReactNode } from 'react';

/** Named markers: marker name → absolute frame number. */
export type CompositionMarkers = Readonly<Record<string, number>>;

/**
 * React context carrying the current composition's markers. Provided by
 * `<CompositionMarkersProvider>`; prefer `useMarker()`.
 */
export const MarkerContext = createContext<CompositionMarkers>({});
MarkerContext.displayName = 'MarkerContext';

export type CompositionMarkersProviderProps = {
  /** Named markers of the composition being rendered. */
  markers: CompositionMarkers;
  children: ReactNode;
};

/**
 * Provides a composition's markers to the tree below — the runtime mounts it
 * with the `markers` resolved from the composition metadata.
 */
export const CompositionMarkersProvider: FC<CompositionMarkersProviderProps> = ({
  markers,
  children,
}) => <MarkerContext.Provider value={markers}>{children}</MarkerContext.Provider>;

/**
 * Resolves a named marker (e.g. `useMarker("drop")`) to its absolute frame
 * number. Returns `null` when the marker does not exist or no markers are
 * in scope — unknown markers are a normal, expected state.
 */
export const useMarker = (name: string): number | null => {
  const markers = useContext(MarkerContext);
  return Object.hasOwn(markers, name) ? markers[name] : null;
};
