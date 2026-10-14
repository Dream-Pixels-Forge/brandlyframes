import { describe, expect, it } from 'vitest';
import { Series } from '../../src/components/series';
import { FrameProbe, renderAtFrame } from '../helpers';

describe('<Series>', () => {
  const tree = (
    <Series>
      <Series.Sequence durationInFrames={10}><FrameProbe /></Series.Sequence>
      <Series.Sequence durationInFrames={20}><FrameProbe /></Series.Sequence>
      <Series.Sequence durationInFrames={5}><FrameProbe /></Series.Sequence>
    </Series>
  );

  it('shows frame 0 to the first child at parent frame 0', () => {
    expect(renderAtFrame(tree, 0)).toContain('frame:0');
  });

  it('counts the first child from 0 to durationInFrames - 1', () => {
    expect(renderAtFrame(tree, 9)).toContain('frame:9');
  });

  it('starts the second child exactly when the first ends (no gaps, no overlap)', () => {
    const output = renderAtFrame(tree, 10);
    expect(output).toContain('frame:0');
    expect(output).not.toContain('frame:9');
  });

  it('shifts each child by the total duration of its predecessors', () => {
    expect(renderAtFrame(tree, 29)).toContain('frame:19');
    expect(renderAtFrame(tree, 30)).toContain('frame:0');
    expect(renderAtFrame(tree, 34)).toContain('frame:4');
  });

  it('renders nothing after the last child ends', () => {
    expect(renderAtFrame(tree, 35)).toBe('');
  });

  it('renders exactly one child at a time', () => {
    for (const frame of [0, 5, 9, 10, 15, 29, 30, 34]) {
      const output = renderAtFrame(tree, frame);
      const matches = output.match(/frame:\d+/g) ?? [];
      expect(matches.length).toBe(1);
    }
  });

  it('supports nested Series inside a Series.Sequence', () => {
    const nested = (
      <Series>
        <Series.Sequence durationInFrames={10}>
          <Series>
            <Series.Sequence durationInFrames={4}><FrameProbe /></Series.Sequence>
            <Series.Sequence durationInFrames={6}><FrameProbe /></Series.Sequence>
          </Series>
        </Series.Sequence>
        <Series.Sequence durationInFrames={10}><FrameProbe /></Series.Sequence>
      </Series>
    );
    expect(renderAtFrame(nested, 3)).toContain('frame:3');
    expect(renderAtFrame(nested, 5)).toContain('frame:1');
    expect(renderAtFrame(nested, 12)).toContain('frame:2');
  });

  it('rejects children that are not <Series.Sequence>', () => {
    expect(() => renderAtFrame(<Series><div /></Series>, 0)).toThrow(
      /<Series> only accepts <Series.Sequence> elements as children/,
    );
    expect(() => renderAtFrame(<Series>hello</Series>, 0)).toThrow(
      /<Series> only accepts <Series.Sequence> elements as children/,
    );
  });

  it('rejects <Series.Sequence> rendered outside <Series>', () => {
    expect(() =>
      renderAtFrame(<Series.Sequence durationInFrames={10}><FrameProbe /></Series.Sequence>, 0),
    ).toThrow(/must be rendered as a direct child of <Series>/);
  });

  it('rejects a zero duration on a child', () => {
    expect(() =>
      renderAtFrame(
        <Series>
          <Series.Sequence durationInFrames={0}><FrameProbe /></Series.Sequence>
        </Series>,
        0,
      ),
    ).toThrow(/<Series.Sequence> durationInFrames must be a positive integer, but got 0/);
  });

  it('propagates layout="none" to child sequences', () => {
    const mixed = (
      <Series>
        <Series.Sequence durationInFrames={10} layout="none"><FrameProbe /></Series.Sequence>
        <Series.Sequence durationInFrames={10}><FrameProbe /></Series.Sequence>
      </Series>
    );
    const atFirstSlot = renderAtFrame(mixed, 0);
    expect(atFirstSlot).toContain('frame:0');
    expect(atFirstSlot).not.toContain('position:absolute');
    const atSecondSlot = renderAtFrame(mixed, 10);
    expect(atSecondSlot).toContain('frame:0');
    expect(atSecondSlot.split('position:absolute').length - 1).toBe(1);
  });

  it('renders an empty Series as nothing', () => {
    expect(renderAtFrame(<Series />, 5)).toBe('');
  });

  it('is deterministic: rendering the same frame twice gives identical output', () => {
    expect(renderAtFrame(tree, 17)).toBe(renderAtFrame(tree, 17));
  });
});
