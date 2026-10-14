import { describe, expect, it } from 'vitest';
import { Freeze } from '../../src/components/freeze';
import { Sequence } from '../../src/components/sequence';
import { FrameProbe, renderAtFrame } from '../helpers';

describe('<Freeze>', () => {
  it('pins the frame to a static value regardless of the parent frame', () => {
    for (const parentFrame of [0, 10, 999]) {
      expect(renderAtFrame(<Freeze frame={30}><FrameProbe /></Freeze>, parentFrame)).toContain('frame:30');
    }
  });

  it('preserves the video config', () => {
    expect(renderAtFrame(<Freeze frame={30}><FrameProbe /></Freeze>, 0)).toContain('d:120');
  });

  it('supports a function override of the parent frame', () => {
    expect(renderAtFrame(<Freeze frame={(frame) => frame + 10}><FrameProbe /></Freeze>, 5)).toContain('frame:15');
    expect(renderAtFrame(<Freeze frame={() => 0}><FrameProbe /></Freeze>, 42)).toContain('frame:0');
  });

  it('composes chained overrides: a function receives the already-frozen frame', () => {
    const tree = (
      <Freeze frame={50}>
        <Freeze frame={(frame) => frame + 10}>
          <FrameProbe />
        </Freeze>
      </Freeze>
    );
    expect(renderAtFrame(tree, 3)).toContain('frame:60');
  });

  it('lets an inner static freeze win over an outer one', () => {
    const tree = (
      <Freeze frame={50}>
        <Freeze frame={20}>
          <FrameProbe />
        </Freeze>
      </Freeze>
    );
    expect(renderAtFrame(tree, 3)).toContain('frame:20');
  });

  it('overrides the frame inside a Sequence', () => {
    const tree = (
      <Sequence from={5} durationInFrames={10}>
        <Freeze frame={0}>
          <FrameProbe />
        </Freeze>
      </Sequence>
    );
    expect(renderAtFrame(tree, 7)).toContain('frame:0');
  });

  it('rejects a frame that does not resolve to a finite integer', () => {
    expect(() => renderAtFrame(<Freeze frame={() => Number.NaN}><FrameProbe /></Freeze>, 0)).toThrow(
      /Frozen frame must be a finite integer/,
    );
    expect(() => renderAtFrame(<Freeze frame={2.5}><FrameProbe /></Freeze>, 0)).toThrow(
      /Frozen frame must be a finite integer/,
    );
  });

  it('always renders (no visibility window of its own)', () => {
    expect(renderAtFrame(<Freeze frame={4}><FrameProbe /></Freeze>, 999)).toContain('frame:4');
  });

  it('is deterministic: rendering the same frame twice gives identical output', () => {
    const tree = <Freeze frame={(frame) => frame * 2}><FrameProbe /></Freeze>;
    expect(renderAtFrame(tree, 21)).toBe(renderAtFrame(tree, 21));
  });
});
