import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  computeSeriesStarts,
  isLoopActive,
  isSequenceVisible,
  resolveFreezeFrame,
  resolveLoopFrame,
  resolveSequenceFrame,
} from '../../src/timing';
import { FrameContextProvider } from '../../src/context';
import { Sequence } from '../../src/components/sequence';
import { Loop } from '../../src/components/loop';
import { Freeze } from '../../src/components/freeze';
import { Series } from '../../src/components/series';
import { TEST_VIDEO_CONFIG, FrameProbe } from '../helpers';
import {
  interpolate,
  interpolateColors,
  random,
  resolveSequenceFrame as publicResolveSequenceFrame,
  spring,
} from '../../src/index';

describe('pure timing determinism (no DOM)', () => {
  it('repeated resolution of the same frame always yields identical values', () => {
    for (let parentFrame = -20; parentFrame <= 320; parentFrame++) {
      expect(
        Object.is(resolveSequenceFrame(parentFrame, 7), resolveSequenceFrame(parentFrame, 7)),
      ).toBe(true);
      expect(Object.is(resolveLoopFrame(parentFrame, 9), resolveLoopFrame(parentFrame, 9))).toBe(
        true,
      );
      expect(
        Object.is(
          resolveFreezeFrame(parentFrame, (f) => f + 3),
          resolveFreezeFrame(parentFrame, (f) => f + 3),
        ),
      ).toBe(true);
      expect(
        Object.is(isSequenceVisible(parentFrame, 7, 13), isSequenceVisible(parentFrame, 7, 13)),
      ).toBe(true);
      expect(Object.is(isLoopActive(parentFrame, 9, 4), isLoopActive(parentFrame, 9, 4))).toBe(
        true,
      );
    }
  });

  it('series layout math is identical on every computation', () => {
    const durations = [3, 5, 7, 11];
    expect(computeSeriesStarts(durations)).toEqual(computeSeriesStarts(durations));
    expect(computeSeriesStarts(durations)).toEqual([0, 3, 8, 15]);
  });

  it('the same nested timeline resolves to an identical frame table on every pass', () => {
    // Sequence(from 10, dur 100) > Loop(dur 12) > Freeze(f<6?0:5) > Sequence(from 2, dur 8)
    const resolveComposite = (parentFrame: number): number | null => {
      if (!isSequenceVisible(parentFrame, 10, 100)) return null;
      const sequenceFrame = resolveSequenceFrame(parentFrame, 10);
      const loopFrame = resolveLoopFrame(sequenceFrame, 12);
      const frozenFrame = resolveFreezeFrame(loopFrame, (frame) => (frame < 6 ? 0 : 5));
      if (!isSequenceVisible(frozenFrame, 2, 8)) return null;
      return resolveSequenceFrame(frozenFrame, 2);
    };

    expect(resolveComposite(0)).toBeNull();
    expect(resolveComposite(15)).toBeNull();
    expect(resolveComposite(16)).toBe(3);
    expect(resolveComposite(40)).toBe(3);
    expect(resolveComposite(109)).toBeNull();
    expect(resolveComposite(110)).toBeNull();

    const firstPass: Array<number | null> = [];
    const secondPass: Array<number | null> = [];
    for (let parentFrame = 0; parentFrame <= 119; parentFrame++) {
      firstPass.push(resolveComposite(parentFrame));
      secondPass.push(resolveComposite(parentFrame));
    }
    expect(secondPass).toEqual(firstPass);
  });
});

describe('cross-module determinism through the public API', () => {
  // One "resolution" of a frame touches timing, animation and utils at once.
  const resolveFrameValue = (frame: number): string => {
    const sequenceFrame = publicResolveSequenceFrame(frame, 5);
    const position = interpolate(sequenceFrame, [0, 100], [0, 1080], { extrapolateRight: 'clamp' });
    const eased = spring({ frame: Math.max(0, sequenceFrame), fps: 30, from: 0, to: 1 });
    const color = interpolateColors(sequenceFrame, [0, 60], ['#FF6A00', '#0044FF']);
    const jitter = random(`frame-${sequenceFrame}`);
    return `${sequenceFrame}|${position}|${eased}|${color}|${jitter}`;
  };

  it('resolving the same frame twice is identical across timing, animation and utils', () => {
    for (let frame = 0; frame <= 130; frame++) {
      expect(resolveFrameValue(frame)).toBe(resolveFrameValue(frame));
    }
    // Sanity: the composite value actually moves with the frame (non-constant).
    expect(resolveFrameValue(0)).not.toBe(resolveFrameValue(42));
  });

  it('two full SSR renders of the same frame through the public API are byte-identical', () => {
    const renderPublic = (frame: number): string =>
      renderToString(
        <FrameContextProvider currentFrame={frame} videoConfig={TEST_VIDEO_CONFIG}>
          <Sequence from={5} durationInFrames={100}>
            <FrameProbe />
          </Sequence>
        </FrameContextProvider>,
      );
    for (const frame of [0, 6, 30, 104, 119]) {
      expect(renderPublic(frame)).toBe(renderPublic(frame));
    }
  });
});

describe('component-tree determinism (SSR, no DOM)', () => {
  const renderAtFrame = (frame: number): string =>
    renderToString(
      <FrameContextProvider currentFrame={frame} videoConfig={TEST_VIDEO_CONFIG}>
        <Sequence from={10} durationInFrames={100}>
          <Loop durationInFrames={12}>
            <Freeze frame={(f) => (f < 6 ? 0 : 5)}>
              <Sequence from={2} durationInFrames={8}>
                <FrameProbe />
              </Sequence>
            </Freeze>
          </Loop>
        </Sequence>
        <Series>
          <Series.Sequence durationInFrames={7}>
            <FrameProbe />
          </Series.Sequence>
          <Series.Sequence durationInFrames={5}>
            <FrameProbe />
          </Series.Sequence>
        </Series>
      </FrameContextProvider>,
    );

  it('rendering frame N twice produces byte-identical output', () => {
    for (const frame of [0, 5, 13, 17, 42, 99, 119]) {
      const first = renderAtFrame(frame);
      const second = renderAtFrame(frame);
      expect(second).toBe(first);
      expect(typeof first).toBe('string');
    }
  });

  it('different frames produce different output (the frame is the only input)', () => {
    expect(renderAtFrame(0)).not.toBe(renderAtFrame(42));
  });
});
