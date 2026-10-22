import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FrameContextProvider } from 'brandlyframes';
import { Camera } from '../src/camera';
import type { CameraMoveConfig } from '../src/types';

type CameraProps = React.ComponentProps<typeof Camera>;

const render = (frame: number, move: CameraMoveConfig): string =>
  renderToString(
    <FrameContextProvider currentFrame={frame}>
      <Camera move={move}>layer</Camera>
    </FrameContextProvider>,
  );

describe('<Camera>', () => {
  it('renders children inside the moving frame', () => {
    const html = render(10, { mode: 'pan', startFrame: 0, endFrame: 20, panX: 100, panY: 0 });
    expect(html).toContain('layer');
  });

  it('applies the interpolated transform for the current frame', () => {
    const html = render(10, { mode: 'pan', startFrame: 0, endFrame: 20, panX: 100, panY: 50 });
    expect(html).toContain('translate3d(50px, 25px, 0)');
    expect(html).toContain('scale(1, 1)');
    expect(html).toContain('rotate(0deg)');
  });

  it('clamps to the end value after the range', () => {
    const html = render(100, { mode: 'pan', startFrame: 0, endFrame: 20, panX: 100, panY: 50 });
    expect(html).toContain('translate3d(100px, 50px, 0)');
  });

  it('dolly zooms to `zoom` at the end frame', () => {
    const html = render(20, { mode: 'dolly', startFrame: 0, endFrame: 20, zoom: 2 });
    expect(html).toContain('scale(2, 2)');
  });

  it('parallax scales the pan by depth', () => {
    const near = render(10, { mode: 'parallax', startFrame: 0, endFrame: 20, panX: 100, panY: 0, depth: 2 });
    const far = render(10, { mode: 'parallax', startFrame: 0, endFrame: 20, panX: 100, panY: 0, depth: 0.5 });
    expect(near).toContain('translate3d(100px, 0px, 0)');
    expect(far).toContain('translate3d(25px, 0px, 0)');
  });

  it('is SSR-deterministic: identical input yields identical HTML', () => {
    const props: CameraProps = { move: { mode: 'dolly', startFrame: 0, endFrame: 20, zoom: 1.5 } };
    const first = renderToString(<FrameContextProvider currentFrame={7}><Camera {...props}>layer</Camera></FrameContextProvider>);
    const second = renderToString(<FrameContextProvider currentFrame={7}><Camera {...props}>layer</Camera></FrameContextProvider>);
    expect(first).toBe(second);
  });
});
