import { useEffect, useState } from 'react';

const devicePixelRatioOf = (): number =>
  typeof window === 'undefined' || window.devicePixelRatio == null
    ? 1
    : window.devicePixelRatio;

/**
 * The device pixel ratio of the current display: `window.devicePixelRatio`
 * in a browser, `1` in Node / render workers where there is no display.
 *
 * Re-renders when the ratio changes (the window is moved to a differently
 * scaled screen) so compositions stay crisp on HiDPI displays. Returns `1`
 * in render workers so the same component is deterministic across preview,
 * Studio and server rendering — `frame -> pixels` never depends on the
 * environment the hook happens to run in.
 */
export const usePixelDensity = (): number => {
  const [dpr, setDpr] = useState(devicePixelRatioOf);
  useEffect(() => {
    const onChange = () => setDpr(devicePixelRatioOf);
    window.addEventListener('resize', onChange);
    return () => window.removeEventListener('resize', onChange);
  }, []);
  return dpr;
};
