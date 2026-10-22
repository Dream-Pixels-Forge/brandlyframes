import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { FrameContextProvider, type VideoConfig } from '../../src/context';
import { Freeze } from '../../src/components/freeze';
import { useIsInsideNonPremountFreeze } from '../../src/hooks';

const TEST_CONFIG: VideoConfig = {
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: 120,
};

const Probe = () => {
  const inside = useIsInsideNonPremountFreeze();
  return <span>{String(inside)}</span>;
};

describe('useIsInsideNonPremountFreeze', () => {
  it('returns false outside any Freeze', () => {
    const html = renderToString(
      <FrameContextProvider currentFrame={0} videoConfig={TEST_CONFIG}>
        <Probe />
      </FrameContextProvider>,
    );
    expect(html).toContain('<span>false</span>');
  });

  it('returns true inside a Freeze', () => {
    const html = renderToString(
      <FrameContextProvider currentFrame={0} videoConfig={TEST_CONFIG}>
        <Freeze frame={0}><Probe /></Freeze>
      </FrameContextProvider>,
    );
    expect(html).toContain('<span>true</span>');
  });

  it('returns true inside nested Freezes', () => {
    const html = renderToString(
      <FrameContextProvider currentFrame={0} videoConfig={TEST_CONFIG}>
        <Freeze frame={0}><Freeze frame={0}><Probe /></Freeze></Freeze>
      </FrameContextProvider>,
    );
    expect(html).toContain('<span>true</span>');
  });

  it('returns false again after the Freeze subtree ends', () => {
    const Inside = () => <span>{String(useIsInsideNonPremountFreeze())}</span>;
    const Outside = () => <span>{String(useIsInsideNonPremountFreeze())}</span>;
    const html = renderToString(
      <FrameContextProvider currentFrame={0} videoConfig={TEST_CONFIG}>
        <>
          <Freeze frame={0}><Inside /></Freeze>
          <Outside />
        </>
      </FrameContextProvider>,
    );
    expect(html).toContain('<span>true</span>');
    expect(html).toContain('<span>false</span>');
  });
});
