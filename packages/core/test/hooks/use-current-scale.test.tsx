import { afterEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { useCurrentScale } from '../../src/hooks';

const setWindow = (devicePixelRatio: number | undefined): void => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value:
      devicePixelRatio === undefined
        ? undefined
        : { devicePixelRatio },
    writable: true,
  });
};

const Probe = () => {
  const scale = useCurrentScale();
  return <span>{String(scale)}</span>;
};

describe('useCurrentScale', () => {
  afterEach(() => {
    setWindow(undefined);
  });

  it('returns 1 when there is no window (Node / render worker)', () => {
    setWindow(undefined);
    expect(renderToString(<Probe />)).toContain('<span>1</span>');
  });

  it('returns the browser device pixel ratio', () => {
    setWindow(2);
    expect(renderToString(<Probe />)).toContain('<span>2</span>');
  });
});
