/**
 * Context tracking whether the current scope is inside a `<Freeze>`.
 * `<Freeze>` provides `true` to its subtree; `useIsInsideNonPremountFreeze`
 * reads it. Defaults to `false` outside any Freeze.
 */

import { createContext, createElement, useContext, type FC, type ReactNode } from 'react';

/** Whether the current scope is inside a `<Freeze>`. */
export const FreezeContext = createContext<boolean>(false);
FreezeContext.displayName = 'FreezeContext';

export type FreezeContextProviderProps = {
  children: ReactNode;
};

/** Provides `true` to every descendant inside a `<Freeze>`. */
export const FreezeContextProvider: FC<FreezeContextProviderProps> = ({
  children,
}) => createElement(FreezeContext.Provider, { value: true }, children);

/** Returns `true` when inside a `<Freeze>` subtree, `false` otherwise. */
export const useIsInsideFreeze = (): boolean => useContext(FreezeContext);
