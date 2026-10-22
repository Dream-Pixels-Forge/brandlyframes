import { useContext } from 'react';
import { FreezeContext } from '../context/freeze-context';

/**
 * Returns `true` when the current scope is inside a `<Freeze>` that has not
 * yet premounted, `false` otherwise. Reads the `FreezeContext` that
 * `<Freeze>` provides to its subtree.
 *
 * Useful for components that need to know whether time is pinned (frozen)
 * so they can skip time-dependent work.
 */
export const useIsInsideNonPremountFreeze = (): boolean =>
  useContext(FreezeContext);
