import { afterEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { usePixelDensity } from '../../src/hooks';

/** Renders the hook value as element text so the initial state is observable. */
const Probe = () => {
  const dpr = usePixelDensity();
  return <span>{String(dpr)}</span>;
};

const setWindow = (devicePixelRatio: number | undefined): void => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value:
      devicePixelRatio === undefined
        ? undefined
        : { devicePixelRatio, addEventListener: () => {}, removeEventListener: () => {} },
    writable: true,
  });
};

describe('usePixelDensity', () => {
  afterEach(() => {
    setWindow(undefined);
  });

  it('returns 1 when there is no window (Node / render worker)', () => {
    setWindow(undefined);
    const html = renderToString(<Probe />);
    expect(html).toContain('<span>1</span>');
  });

  it('returns the browser device pixel ratio', () => {
    setWindow(2);
    const html = renderToString(<Probe />);
    expect(html).toContain('<span>2</span>');
  });

  it('returns 1 when window.devicePixelRatio is missing', () => {
    setWindow(undefined);
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { addEventListener: () => {}, removeEventListener: () => {} },
      writable: true,
    });
    const html = renderToString(<Probe />);
    expect(html).toContain('<span>1</span>');
  });
});
