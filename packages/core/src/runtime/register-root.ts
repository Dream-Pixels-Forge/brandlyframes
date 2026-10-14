/**
 * `registerRoot()` — the entry-point bootstrap (BF-002): your entry file
 * calls `registerRoot(<Root />)` once; the bundler, Studio, Player and
 * renderer retrieve the root with `getRootComponent()` and mount it. No UI,
 * no capture logic.
 */

import type { FC } from 'react';

let rootComponent: FC | null = null;

/**
 * Registers the root component that declares all `<Composition>` elements.
 * Calling it again replaces the previous root (the latest registration
 * wins), which keeps hot reload simple. Throws a helpful error when called
 * without a component function.
 */
export const registerRoot = (component: FC): void => {
  if (typeof component !== 'function') {
    throw new Error(
      `registerRoot(): expected a React component function (e.g. registerRoot(Root)), but got ${typeof component} (${String(
        component,
      )}).`,
    );
  }
  rootComponent = component;
};

/**
 * The registered root component. Throws a helpful error when
 * `registerRoot()` was never called — the runtime cannot render anything
 * without it.
 */
export const getRootComponent = (): FC => {
  if (rootComponent === null) {
    throw new Error(
      'getRootComponent(): no root has been registered — call registerRoot(<Root />) in your entry file first.',
    );
  }
  return rootComponent;
};
