import { describe, expect, it, vi } from 'vitest';
import type { FC } from 'react';

const Root: FC = () => null;
const OtherRoot: FC = () => null;

const loadRuntime = async () => {
  vi.resetModules();
  return await import('../../src/runtime');
};

describe('registerRoot (BF-002)', () => {
  it('stores the root component so the runtime can retrieve it', async () => {
    const { getRootComponent, registerRoot } = await loadRuntime();
    registerRoot(Root);
    expect(getRootComponent()).toBe(Root);
  });

  it('allows re-registration (the latest root wins — hot reload support)', async () => {
    const { getRootComponent, registerRoot } = await loadRuntime();
    registerRoot(Root);
    registerRoot(OtherRoot);
    expect(getRootComponent()).toBe(OtherRoot);
  });

  it('throws a helpful error when called with a non-component', async () => {
    const { registerRoot } = await loadRuntime();
    expect(() => registerRoot(undefined as unknown as FC)).toThrowError(/registerRoot/);
    expect(() => registerRoot('Root' as unknown as FC)).toThrowError(/registerRoot/);
  });

  it('throws a helpful error when no root was registered', async () => {
    const { getRootComponent } = await loadRuntime();
    expect(() => getRootComponent()).toThrowError(/registerRoot/);
  });
});
