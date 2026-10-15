import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  mapFrameVideoIndex,
  FrameVideo,
  type FrameVideoProps,
} from '../src/index';

/**
 * <FrameVideo> trim / playbackRate / reverse / freeze / ping-pong [BF-054].
 *
 * `mapFrameVideoIndex` is the pure index-mapping core; `<FrameVideo>` is a
 * thin deterministic renderer over it (`src + '#frame=' + mapped`).
 */

describe('mapFrameVideoIndex [BF-054]', () => {
  describe('trim window basics', () => {
    it('maps n onto [from, to) with trim=[2,6]', () => {
      expect(mapFrameVideoIndex(0, 10, { trim: [2, 6] })).toBe(2);
      expect(mapFrameVideoIndex(1, 10, { trim: [2, 6] })).toBe(3);
      expect(mapFrameVideoIndex(2, 10, { trim: [2, 6] })).toBe(4);
      expect(mapFrameVideoIndex(3, 10, { trim: [2, 6] })).toBe(5);
    });

    it('clamps at the window end, never blank', () => {
      expect(mapFrameVideoIndex(99, 10, { trim: [2, 6] })).toBe(5);
    });

    it('intersects the window with [0, length)', () => {
      expect(mapFrameVideoIndex(0, 4, { trim: [2, 100] })).toBe(2);
      expect(mapFrameVideoIndex(50, 4, { trim: [2, 100] })).toBe(3);
    });

    it('defaults to the full [0, length) window', () => {
      expect(mapFrameVideoIndex(0, 4)).toBe(0);
      expect(mapFrameVideoIndex(3, 4)).toBe(3);
    });
  });

  describe('playbackRate', () => {
    it('rate 2 shows every other source frame', () => {
      expect(mapFrameVideoIndex(0, 10, { playbackRate: 2 })).toBe(0);
      expect(mapFrameVideoIndex(1, 10, { playbackRate: 2 })).toBe(2);
      expect(mapFrameVideoIndex(2, 10, { playbackRate: 2 })).toBe(4);
      expect(mapFrameVideoIndex(3, 10, { playbackRate: 2 })).toBe(6);
    });

    it('fractional rate floors the product', () => {
      expect(mapFrameVideoIndex(0, 100, { playbackRate: 1.5 })).toBe(0);
      expect(mapFrameVideoIndex(1, 100, { playbackRate: 1.5 })).toBe(1);
      expect(mapFrameVideoIndex(2, 100, { playbackRate: 1.5 })).toBe(3);
      expect(mapFrameVideoIndex(3, 100, { playbackRate: 1.5 })).toBe(4);
    });

    it('slow rate repeats source frames', () => {
      expect(mapFrameVideoIndex(0, 100, { playbackRate: 0.5 })).toBe(0);
      expect(mapFrameVideoIndex(1, 100, { playbackRate: 0.5 })).toBe(0);
      expect(mapFrameVideoIndex(2, 100, { playbackRate: 0.5 })).toBe(1);
    });
  });

  describe('reverse', () => {
    it('maps len-1-n over a 4-frame source', () => {
      expect(mapFrameVideoIndex(0, 4, { reverse: true })).toBe(3);
      expect(mapFrameVideoIndex(1, 4, { reverse: true })).toBe(2);
      expect(mapFrameVideoIndex(2, 4, { reverse: true })).toBe(1);
      expect(mapFrameVideoIndex(3, 4, { reverse: true })).toBe(0);
    });

    it('clamps at the window start when reversed past the end', () => {
      expect(mapFrameVideoIndex(9, 4, { reverse: true })).toBe(0);
    });

    it('reverses within the trim window', () => {
      expect(mapFrameVideoIndex(0, 10, { trim: [2, 6], reverse: true })).toBe(5);
      expect(mapFrameVideoIndex(3, 10, { trim: [2, 6], reverse: true })).toBe(2);
      expect(mapFrameVideoIndex(9, 10, { trim: [2, 6], reverse: true })).toBe(2);
    });
  });

  describe('freeze', () => {
    it('always returns f regardless of n', () => {
      for (const n of [0, 1, 5, 100]) {
        expect(mapFrameVideoIndex(n, 4, { freeze: 2 })).toBe(2);
      }
    });

    it('clamps f into the window', () => {
      expect(mapFrameVideoIndex(0, 4, { freeze: 99 })).toBe(3);
      expect(mapFrameVideoIndex(0, 10, { trim: [2, 6], freeze: 0 })).toBe(2);
      expect(mapFrameVideoIndex(0, 10, { trim: [2, 6], freeze: 99 })).toBe(5);
    });

    it('freeze=null behaves as no freeze', () => {
      expect(mapFrameVideoIndex(1, 4, { freeze: null })).toBe(1);
    });
  });

  describe('pingPong', () => {
    it('period for L=4 is 0,1,2,3,2,1,0,1 over n=0..7', () => {
      const expected = [0, 1, 2, 3, 2, 1, 0, 1];
      expected.forEach((want, n) => {
        expect(mapFrameVideoIndex(n, 4, { pingPong: true })).toBe(want);
      });
    });

    it('ignores reverse when pingPong is set', () => {
      for (let n = 0; n < 12; n += 1) {
        expect(mapFrameVideoIndex(n, 4, { pingPong: true, reverse: true })).toBe(
          mapFrameVideoIndex(n, 4, { pingPong: true }),
        );
      }
    });

    it('returns from for a single-frame window', () => {
      expect(mapFrameVideoIndex(0, 10, { trim: [3, 4], pingPong: true })).toBe(3);
      expect(mapFrameVideoIndex(57, 10, { trim: [3, 4], pingPong: true })).toBe(3);
    });

    it('ping-pongs within the trim window', () => {
      const expected = [2, 3, 4, 5, 4, 3, 2, 3];
      expected.forEach((want, n) => {
        expect(
          mapFrameVideoIndex(n, 10, { trim: [2, 6], pingPong: true }),
        ).toBe(want);
      });
    });
  });

  describe('clamp at end', () => {
    it('holds the last frame instead of going blank', () => {
      expect(mapFrameVideoIndex(3, 4)).toBe(3);
      expect(mapFrameVideoIndex(4, 4)).toBe(3);
      expect(mapFrameVideoIndex(1000, 4)).toBe(3);
    });
  });

  describe('validation', () => {
    it('throws for invalid n', () => {
      expect(() => mapFrameVideoIndex(-1, 4)).toThrow();
      expect(() => mapFrameVideoIndex(1.5, 4)).toThrow();
      expect(() => mapFrameVideoIndex(NaN, 4)).toThrow();
    });

    it('throws for invalid length', () => {
      expect(() => mapFrameVideoIndex(0, 0)).toThrow();
      expect(() => mapFrameVideoIndex(0, -3)).toThrow();
      expect(() => mapFrameVideoIndex(0, 2.5)).toThrow();
    });

    it('throws for invalid trim', () => {
      expect(() => mapFrameVideoIndex(0, 10, { trim: [3, 3] })).toThrow();
      expect(() => mapFrameVideoIndex(0, 10, { trim: [5, 2] })).toThrow();
      expect(() => mapFrameVideoIndex(0, 10, { trim: [-1, 3] })).toThrow();
      expect(() => mapFrameVideoIndex(0, 10, { trim: [1.5, 4] })).toThrow();
    });

    it('throws for invalid playbackRate', () => {
      expect(() => mapFrameVideoIndex(0, 4, { playbackRate: 0 })).toThrow();
      expect(() => mapFrameVideoIndex(0, 4, { playbackRate: -1 })).toThrow();
      expect(() => mapFrameVideoIndex(0, 4, { playbackRate: NaN })).toThrow();
      expect(
        () => mapFrameVideoIndex(0, 4, { playbackRate: Infinity }),
      ).toThrow();
    });

    it('throws for invalid freeze', () => {
      expect(() => mapFrameVideoIndex(0, 4, { freeze: -1 })).toThrow();
      expect(() => mapFrameVideoIndex(0, 4, { freeze: 1.5 })).toThrow();
    });

    it('throws when the intersected window is empty', () => {
      expect(() => mapFrameVideoIndex(0, 4, { trim: [10, 20] })).toThrow();
      expect(() => mapFrameVideoIndex(0, 4, { trim: [4, 5] })).toThrow();
    });
  });

  describe('no floating-point drift', () => {
    it('long rate=1.5 sequences match an integer-arithmetic reference', () => {
      for (let n = 0; n <= 500; n += 1) {
        // Integer-only reference for floor(n * 1.5): (3n) / 2 via BigInt.
        const expected = Number((BigInt(n) * 3n) / 2n);
        expect(mapFrameVideoIndex(n, 1000, { playbackRate: 1.5 })).toBe(
          expected,
        );
      }
    });
  });
});

describe('<FrameVideo> [BF-054]', () => {
  /** Mocked frame source: frames with burnt-in counters. */
  const counters: ReadonlyArray<string> = ['F0', 'F1', 'F2', 'F3'];
  const SRC = 'clip://mock';

  type StaticMarkup = Parameters<typeof renderToStaticMarkup>[0];

  const renderFrame = (props: FrameVideoProps): string =>
    renderToStaticMarkup(FrameVideo(props) as StaticMarkup);

  const dataFrameOf = (html: string): number => {
    const match = /data-frame="(\d+)"/.exec(html);
    if (match === null || match[1] === undefined) {
      throw new Error(`no data-frame in markup: ${html}`);
    }
    return Number(match[1]);
  };

  it('renders img with src fragment and data-frame for the default mode', () => {
    const html = renderFrame({ src: SRC, length: 4, frame: 1 });
    expect(dataFrameOf(html)).toBe(1);
    expect(html).toContain(`src="${SRC}#frame=1"`);
    expect(counters[dataFrameOf(html)]).toBe('F1');
  });

  it('renders the reversed index (n=1 of 4 frames -> data-frame=2)', () => {
    const html = renderFrame({ src: SRC, length: 4, frame: 1, reverse: true });
    expect(dataFrameOf(html)).toBe(2);
    expect(html).toContain(`src="${SRC}#frame=2"`);
    expect(counters[dataFrameOf(html)]).toBe('F2');
  });

  it('renders trim, playbackRate, freeze, and pingPong modes', () => {
    const cases: ReadonlyArray<{ props: FrameVideoProps; want: number }> = [
      { props: { src: SRC, length: 10, frame: 1, trim: [2, 6] }, want: 3 },
      { props: { src: SRC, length: 10, frame: 2, playbackRate: 2 }, want: 4 },
      { props: { src: SRC, length: 4, frame: 0, freeze: 3 }, want: 3 },
      { props: { src: SRC, length: 4, frame: 4, pingPong: true }, want: 2 },
    ];
    for (const { props, want } of cases) {
      const html = renderFrame(props);
      expect(dataFrameOf(html)).toBe(want);
      expect(html).toContain(`src="${SRC}#frame=${want}"`);
    }
  });

  it('resolves every frame of the mocked source without drift', () => {
    for (let n = 0; n < 4; n += 1) {
      const html = renderFrame({ src: SRC, length: 4, frame: n });
      expect(counters[dataFrameOf(html)]).toBe(`F${n}`);
    }
  });
});
