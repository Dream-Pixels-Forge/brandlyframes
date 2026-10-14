import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FrameContextProvider } from '../../src/context';
import { TEST_VIDEO_CONFIG, FrameProbe, ConfigProbe } from '../helpers';

describe('<FrameContextProvider>', () => {
  it('renders its children', () => {
    const output = renderToString(
      <FrameContextProvider currentFrame={0} videoConfig={TEST_VIDEO_CONFIG}>
        <span>ok</span>
      </FrameContextProvider>,
    );
    expect(output).toContain('ok');
  });

  it('supplies currentFrame to useCurrentFrame', () => {
    const output = renderToString(
      <FrameContextProvider currentFrame={7} videoConfig={TEST_VIDEO_CONFIG}>
        <FrameProbe />
      </FrameContextProvider>,
    );
    expect(output).toContain('frame:7');
  });

  it('supplies the video config to useVideoConfig', () => {
    const output = renderToString(
      <FrameContextProvider currentFrame={0} videoConfig={TEST_VIDEO_CONFIG}>
        <ConfigProbe />
      </FrameContextProvider>,
    );
    expect(output).toContain('fps:30');
    expect(output).toContain('w:1080');
    expect(output).toContain('h:1920');
    expect(output).toContain('d:120');
  });

  it('inherits the parent frame when only videoConfig is overridden', () => {
    const output = renderToString(
      <FrameContextProvider currentFrame={9} videoConfig={TEST_VIDEO_CONFIG}>
        <FrameContextProvider videoConfig={{ fps: 60, width: 100, height: 100, durationInFrames: 10 }}>
          <FrameProbe />
        </FrameContextProvider>
      </FrameContextProvider>,
    );
    expect(output).toContain('frame:9');
    expect(output).toContain('fps:60');
  });

  it('inherits the parent video config when only currentFrame is overridden', () => {
    const output = renderToString(
      <FrameContextProvider currentFrame={9} videoConfig={TEST_VIDEO_CONFIG}>
        <FrameContextProvider currentFrame={4}>
          <FrameProbe />
        </FrameContextProvider>
      </FrameContextProvider>,
    );
    expect(output).toContain('frame:4');
    expect(output).toContain('d:120');
  });

  it('rejects a fractional currentFrame', () => {
    expect(() =>
      renderToString(
        <FrameContextProvider currentFrame={1.5} videoConfig={TEST_VIDEO_CONFIG}>
          <span />
        </FrameContextProvider>,
      ),
    ).toThrow(/<FrameContextProvider> currentFrame must be an integer, but got 1\.5/);
  });

  it('rejects an invalid video config', () => {
    expect(() =>
      renderToString(
        <FrameContextProvider currentFrame={0} videoConfig={{ ...TEST_VIDEO_CONFIG, fps: 0 }}>
          <span />
        </FrameContextProvider>,
      ),
    ).toThrow(/fps must be a positive number/);
  });
});

describe('useCurrentFrame', () => {
  it('throws a helpful error outside a provider', () => {
    expect(() => renderToString(<FrameProbe />)).toThrow(
      /useCurrentFrame\(\) must be used inside a <FrameContextProvider>/,
    );
  });

  it('throws a helpful error when the tree only has a video config (no frame yet)', () => {
    expect(() =>
      renderToString(
        <FrameContextProvider videoConfig={TEST_VIDEO_CONFIG}>
          <FrameProbe />
        </FrameContextProvider>,
      ),
    ).toThrow(/useCurrentFrame\(\) must be used inside a <FrameContextProvider>/);
  });
});

describe('useVideoConfig', () => {
  it('throws a helpful error outside a provider', () => {
    expect(() => renderToString(<ConfigProbe />)).toThrow(
      /useVideoConfig\(\) must be used inside a <FrameContextProvider>/,
    );
  });

  it('throws a helpful error when the tree only has a frame (no config yet)', () => {
    expect(() =>
      renderToString(
        <FrameContextProvider currentFrame={0}>
          <ConfigProbe />
        </FrameContextProvider>,
      ),
    ).toThrow(/useVideoConfig\(\) must be used inside a <FrameContextProvider>/);
  });
});
