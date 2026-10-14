import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Loop } from '../../src/components/loop';
import { Sequence } from '../../src/components/sequence';
import { Freeze } from '../../src/components/freeze';
import { FrameProbe, renderAtFrame } from '../helpers';

describe('<Loop>', () => {
  it('shows frame 0 at the start', () => {
    expect(renderAtFrame(<Loop durationInFrames={10}><FrameProbe /></Loop>, 0)).toContain('frame:0');
  });

  it('counts up within an iteration', () => {
    expect(renderAtFrame(<Loop durationInFrames={10}><FrameProbe /></Loop>, 9)).toContain('frame:9');
  });

  it('resets the child frame when an iteration ends', () => {
    expect(renderAtFrame(<Loop durationInFrames={10}><FrameProbe /></Loop>, 10)).toContain('frame:0');
    expect(renderAtFrame(<Loop durationInFrames={10}><FrameProbe /></Loop>, 25)).toContain('frame:5');
  });

  it('loops indefinitely by default (no `times`)', () => {
    expect(renderAtFrame(<Loop durationInFrames={10}><FrameProbe /></Loop>, 500)).toContain('frame:0');
  });

  it('stops after `times` iterations', () => {
    expect(renderAtFrame(<Loop durationInFrames={10} times={2}><FrameProbe /></Loop>, 19)).toContain('frame:9');
    expect(renderAtFrame(<Loop durationInFrames={10} times={2}><FrameProbe /></Loop>, 20)).toBe('');
    expect(renderAtFrame(<Loop durationInFrames={10} times={1}><FrameProbe /></Loop>, 10)).toBe('');
  });

  it('wraps around again for later iterations', () => {
    expect(renderAtFrame(<Loop durationInFrames={10} times={3}><FrameProbe /></Loop>, 27)).toContain('frame:7');
  });

  it('rejects a zero duration', () => {
    expect(() => renderAtFrame(<Loop durationInFrames={0}><FrameProbe /></Loop>, 0)).toThrow(
      /<Loop> durationInFrames must be a positive integer, but got 0/,
    );
  });

  it('rejects invalid `times`', () => {
    expect(() => renderAtFrame(<Loop durationInFrames={10} times={0}><FrameProbe /></Loop>, 0)).toThrow(
      /<Loop> times must be a positive integer, but got 0/,
    );
    expect(() => renderAtFrame(<Loop durationInFrames={10} times={1.5}><FrameProbe /></Loop>, 0)).toThrow(
      /<Loop> times must be a positive integer/,
    );
  });

  it('wraps inside a nested Loop', () => {
    const nested = (
      <Loop durationInFrames={10}>
        <Loop durationInFrames={3}>
          <FrameProbe />
        </Loop>
      </Loop>
    );
    expect(renderAtFrame(nested, 23)).toContain('frame:0');
    expect(renderAtFrame(nested, 24)).toContain('frame:1');
    expect(renderAtFrame(nested, 29)).toContain('frame:0');
  });

  it('composes with a surrounding Sequence offset', () => {
    const tree = (
      <Sequence from={5} durationInFrames={20}>
        <Loop durationInFrames={4}>
          <FrameProbe />
        </Loop>
      </Sequence>
    );
    expect(renderAtFrame(tree, 5)).toContain('frame:0');
    expect(renderAtFrame(tree, 9)).toContain('frame:0');
    expect(renderAtFrame(tree, 11)).toContain('frame:2');
  });

  it('freezes a frame inside the loop', () => {
    const tree = (
      <Loop durationInFrames={10}>
        <Freeze frame={2}>
          <FrameProbe />
        </Freeze>
      </Loop>
    );
    expect(renderAtFrame(tree, 0)).toContain('frame:2');
    expect(renderAtFrame(tree, 12)).toContain('frame:2');
    expect(renderAtFrame(tree, 27)).toContain('frame:2');
  });

  it('wraps children in an AbsoluteFill by default and honours layout="none"', () => {
    expect(renderAtFrame(<Loop durationInFrames={10}><FrameProbe /></Loop>, 0)).toContain('position:absolute');
    expect(renderAtFrame(<Loop durationInFrames={10} layout="none"><FrameProbe /></Loop>, 0)).not.toContain(
      'position:absolute',
    );
  });

  it('throws a helpful error outside a frame context', () => {
    expect(() => renderToString(<Loop durationInFrames={10}><span /></Loop>)).toThrow(
      /useCurrentFrame\(\) must be used inside a <FrameContextProvider>/,
    );
  });

  it('is deterministic: rendering the same frame twice gives identical output', () => {
    const tree = <Loop durationInFrames={7}><FrameProbe /></Loop>;
    expect(renderAtFrame(tree, 23)).toBe(renderAtFrame(tree, 23));
  });
});
