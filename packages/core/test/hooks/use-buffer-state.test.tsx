import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  computeBufferState,
  useBufferState,
  type BufferState,
} from '../../src/hooks';

/** A minimal fake HTMLMediaElement for testing buffering state. */
class FakeMediaElement {
  buffered: TimeRanges;
  currentTime: number;
  duration: number;
  private listeners: Record<string, Set<EventListener>> = {};

  constructor(opts: FakeMediaElementOpts = {}) {
    this.currentTime = opts.currentTime ?? 0;
    this.duration = opts.duration ?? 0;
    const buffered = opts.buffered ?? [];
    const list: { start: number; end: number }[] = [];
    for (let i = 0; i < buffered.length; i += 2) {
      list.push({ start: buffered[i], end: buffered[i + 1] });
    }
    this.buffered = {
      length: list.length,
      start: (index: number) => list[index]?.start ?? -1,
      end: (index: number) => list[index]?.end ?? -1,
    } as unknown as TimeRanges;
  }

  addEventListener(type: string, listener: EventListener): void {
    (this.listeners[type] ??= new Set()).add(listener);
  }
  removeEventListener(type: string, listener: EventListener): void {
    this.listeners[type]?.delete(listener);
  }
  dispatch(type: string): void {
    for (const listener of this.listeners[type] ?? []) {
      listener({ type } as unknown as Event);
    }
  }
}

interface FakeMediaElementOpts {
  buffered?: number[];
  currentTime?: number;
  duration?: number;
}

/** Renders `useBufferState(media)` and returns the resulting BufferState. */
const renderBufferState = (
  media: FakeMediaElement | null,
): BufferState => {
  let captured: BufferState = emptyState;
  const Probe = () => {
    captured = useBufferState(media);
    return null;
  };
  // SSR runs the useState initializer (initial computation) but not effects,
  // so this reads the initial buffer state derived from the element.
  renderToString(<Probe />);
  return captured;
};

const emptyState: BufferState = {
  isBuffering: false,
  ranges: [],
  bufferedSeconds: 0,
};

describe('computeBufferState', () => {
  it('is not buffering when the playhead sits inside a buffered range', () => {
    const state = computeBufferState({
      ranges: [{ start: 0, end: 10 }],
      currentTime: 5,
      isWaiting: false,
    });
    expect(state.isBuffering).toBe(false);
    expect(state.bufferedSeconds).toBeCloseTo(10);
  });

  it('is buffering when the playhead is outside every buffered range', () => {
    const state = computeBufferState({
      ranges: [{ start: 0, end: 2 }],
      currentTime: 5,
      isWaiting: false,
    });
    expect(state.isBuffering).toBe(true);
    expect(state.bufferedSeconds).toBeCloseTo(2);
  });

  it('is buffering when there are no buffered ranges', () => {
    const state = computeBufferState({
      ranges: [],
      currentTime: 0,
      isWaiting: false,
    });
    expect(state.isBuffering).toBe(true);
    expect(state.bufferedSeconds).toBe(0);
  });

  it('is buffering when the element is waiting, even inside a range', () => {
    const state = computeBufferState({
      ranges: [{ start: 0, end: 10 }],
      currentTime: 5,
      isWaiting: true,
    });
    expect(state.isBuffering).toBe(true);
  });

  it('sums multiple buffered ranges', () => {
    const state = computeBufferState({
      ranges: [
        { start: 0, end: 2 },
        { start: 5, end: 9 },
      ],
      currentTime: 1,
      isWaiting: false,
    });
    expect(state.bufferedSeconds).toBeCloseTo(6);
  });

  it('treats the end of a range as covering the playhead', () => {
    const state = computeBufferState({
      ranges: [{ start: 0, end: 5 }],
      currentTime: 5,
      isWaiting: false,
    });
    expect(state.isBuffering).toBe(false);
  });
});

describe('useBufferState', () => {
  it('returns non-buffering state when no media element is provided', () => {
    const state = renderBufferState(null);
    expect(state).toEqual(emptyState);
  });

  it('returns non-buffering state when currentTime is inside a buffered range', () => {
    const media = new FakeMediaElement({ buffered: [0, 10], currentTime: 5, duration: 10 });
    const state = renderBufferState(media);
    expect(state.isBuffering).toBe(false);
    expect(state.bufferedSeconds).toBeCloseTo(10);
  });

  it('reports buffering when currentTime is not covered by any buffered range', () => {
    const media = new FakeMediaElement({ buffered: [0, 2], currentTime: 5, duration: 10 });
    const state = renderBufferState(media);
    expect(state.isBuffering).toBe(true);
    expect(state.bufferedSeconds).toBeCloseTo(2);
  });

  it('reports buffering when there are no buffered ranges', () => {
    const media = new FakeMediaElement({ buffered: [], currentTime: 0, duration: 10 });
    const state = renderBufferState(media);
    expect(state.isBuffering).toBe(true);
    expect(state.bufferedSeconds).toBe(0);
  });

  it('treats range end as covering the playhead', () => {
    const media = new FakeMediaElement({ buffered: [0, 5], currentTime: 5, duration: 10 });
    const state = renderBufferState(media);
    expect(state.isBuffering).toBe(false);
  });
});
