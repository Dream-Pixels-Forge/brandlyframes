import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { SequenceLayout } from '../../src/components/sequence';
import { Sequence } from '../../src/components/sequence';
import { FrameProbe, renderAtFrame } from '../helpers';

describe('<Sequence>', () => {
  it('shows frame 0 to its children when the parent frame equals `from`', () => {
    expect(renderAtFrame(<Sequence from={10} durationInFrames={10}><FrameProbe /></Sequence>, 10)).toContain('frame:0');
  });

  it('shifts the frame the children observe by `from`', () => {
    expect(renderAtFrame(<Sequence from={10} durationInFrames={10}><FrameProbe /></Sequence>, 17)).toContain('frame:7');
  });

  it('renders nothing before `from`', () => {
    expect(renderAtFrame(<Sequence from={10} durationInFrames={10}><FrameProbe /></Sequence>, 9)).toBe('');
  });

  it('renders nothing at from + durationInFrames (end is exclusive)', () => {
    expect(renderAtFrame(<Sequence from={10} durationInFrames={10}><FrameProbe /></Sequence>, 20)).toBe('');
  });

  it('renders on the last frame', () => {
    expect(renderAtFrame(<Sequence from={10} durationInFrames={10}><FrameProbe /></Sequence>, 19)).toContain('frame:9');
  });

  it('supports negative `from` (child frame runs ahead of the parent)', () => {
    expect(renderAtFrame(<Sequence from={-5} durationInFrames={10}><FrameProbe /></Sequence>, 0)).toContain('frame:5');
    expect(renderAtFrame(<Sequence from={-5} durationInFrames={10}><FrameProbe /></Sequence>, 4)).toContain('frame:9');
    expect(renderAtFrame(<Sequence from={-5} durationInFrames={10}><FrameProbe /></Sequence>, 5)).toBe('');
  });

  it('wraps children in an AbsoluteFill by default', () => {
    expect(renderAtFrame(<Sequence from={0} durationInFrames={10}><FrameProbe /></Sequence>, 0)).toContain(
      'position:absolute',
    );
  });

  it('renders children directly with layout="none"', () => {
    const output = renderAtFrame(<Sequence from={0} durationInFrames={10} layout="none"><FrameProbe /></Sequence>, 0);
    expect(output).not.toContain('position:absolute');
    expect(output).toContain('frame:0');
  });

  it('rejects an unknown layout', () => {
    expect(() =>
      renderAtFrame(
        <Sequence from={0} durationInFrames={10} layout={'bogus' as unknown as SequenceLayout}>
          <FrameProbe />
        </Sequence>,
        0,
      ),
    ).toThrow(/layout must be either 'absolute-fill' or 'none'/);
  });

  it('preserves the video config for children', () => {
    expect(renderAtFrame(<Sequence from={5} durationInFrames={10}><FrameProbe /></Sequence>, 6)).toContain('d:120');
  });

  it('rejects a zero duration', () => {
    expect(() =>
      renderAtFrame(<Sequence from={0} durationInFrames={0}><FrameProbe /></Sequence>, 0),
    ).toThrow(/<Sequence> durationInFrames must be a positive integer, but got 0/);
  });

  it('rejects a fractional or negative duration', () => {
    expect(() =>
      renderAtFrame(<Sequence from={0} durationInFrames={2.5}><FrameProbe /></Sequence>, 0),
    ).toThrow(/<Sequence> durationInFrames must be a positive integer/);
    expect(() =>
      renderAtFrame(<Sequence from={0} durationInFrames={-4}><FrameProbe /></Sequence>, 0),
    ).toThrow(/<Sequence> durationInFrames must be a positive integer/);
  });

  it('rejects a fractional from', () => {
    expect(() =>
      renderAtFrame(<Sequence from={1.5} durationInFrames={10}><FrameProbe /></Sequence>, 5),
    ).toThrow(/<Sequence> from must be an integer, but got 1\.5/);
  });

  it('throws a helpful error outside a frame context', () => {
    expect(() => renderToString(<Sequence from={0} durationInFrames={10}><span /></Sequence>)).toThrow(
      /useCurrentFrame\(\) must be used inside a <FrameContextProvider>/,
    );
  });

  it('composes offsets across nested sequences', () => {
    const tree = (
      <Sequence from={10} durationInFrames={20}>
        <FrameProbe />
        <Sequence from={5} durationInFrames={5}>
          <FrameProbe />
        </Sequence>
      </Sequence>
    );
    const at14 = renderAtFrame(tree, 14);
    expect(at14).toContain('frame:4');
    expect(at14).not.toContain('frame:0');
    const at15 = renderAtFrame(tree, 15);
    expect(at15).toContain('frame:5');
    expect(at15).toContain('frame:0');
    const at19 = renderAtFrame(tree, 19);
    expect(at19).toContain('frame:9');
    expect(at19).toContain('frame:4');
    const at20 = renderAtFrame(tree, 20);
    expect(at20).toContain('frame:10');
    expect(at20).not.toContain('frame:0');
    expect(renderAtFrame(tree, 30)).toBe('');
  });

  it('is deterministic: rendering the same frame twice gives identical output', () => {
    const tree = <Sequence from={3} durationInFrames={20}><FrameProbe /></Sequence>;
    expect(renderAtFrame(tree, 11)).toBe(renderAtFrame(tree, 11));
  });
});
