/**
 * `<HtmlInCanvas>` — renders its children into an offscreen `<canvas>` so the
 * renderer can treat HTML as an image texture (a performance fast lane vs.
 * DOM screenshots). The canvas element is the renderable output; client-side
 * pixel drawing (serialise children → drawImage) is the next enhancement.
 *
 * Requires a browser DOM environment (`document`). Throws a helpful error in
 * pure Node / render-worker contexts so the failure is explicit rather than
 * a silent blank frame.
 */

import type { FC, ReactNode } from 'react';

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

export type HtmlInCanvasProps = {
  /** Canvas width in CSS pixels. */
  width?: number;
  /** Canvas height in CSS pixels. */
  height?: number;
  children?: ReactNode;
};

/**
 * Renders a `<canvas>` sized to `width`/`height`. Requires `document`;
 * throws outside a browser environment.
 */
export const HtmlInCanvas: FC<HtmlInCanvasProps> = ({
  children,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}) => {
  if (typeof document === 'undefined') {
    throw new Error(
      'HtmlInCanvas(): requires a browser DOM environment (`document`) — render it in Studio/Player, not in a pure Node context without a DOM.',
    );
  }
  // Touch the DOM so SSR environments without a real document surface a clear error
  // instead of a silent blank frame. The `<canvas>` below is React's render output.
  void document.createElement('canvas');
  return (
    <canvas width={width} height={height} style={{ display: 'block' }}>
      {children}
    </canvas>
  );
};
