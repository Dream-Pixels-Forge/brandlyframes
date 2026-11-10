import { describe, expect, it } from 'vitest';
import {
  reverseFrame,
  pingPongFrame,
  variableSpeedFrame,
  layerFrame,
  layerTimeline,
  timeWarpFrame,
  type SpeedSegment,
} from '../src/time-warp';

describe('reverseFrame (BF-510)', () => {
  it('reverses 0..300', () => {
    expect(reverseFrame(0, 300, 0)).toBe(300);
    expect(reverseFrame(1, 300, 0)).toBe(299);
    expect(reverseFrame(300, 300, 0)).toBe(0);
  });

  it('works with end > start (ascending reverse)', () => {
    // reverseFrame(frame, 0, 300): plays 300→0
    expect(reverseFrame(0, 0, 300)).toBe(300);
    expect(reverseFrame(5, 0, 300)).toBe(295);
  });

  it('clamps out-of-range frames', () => {
    expect(reverseFrame(-10, 10, 0)).toBe(10); // below range → hi
    expect(reverseFrame(999, 10, 0)).toBe(0); // above range → lo
  });

  it('zero-span returns the single value', () => {
    expect(reverseFrame(5, 7, 7)).toBe(7);
  });
});

describe('pingPongFrame (BF-510)', () => {
  it('ping-pongs within [0, duration]', () => {
    const d = 5;
    // forward: 0,1,2,3,4,5
    for (let f = 0; f <= d; f++) expect(pingPongFrame(f, d)).toBe(f);
    // back: 6→4, 7→3, 8→2, 9→1, 10→0
    expect(pingPongFrame(6, d)).toBe(4);
    expect(pingPongFrame(7, d)).toBe(3);
    expect(pingPongFrame(10, d)).toBe(0);
    // repeats: period = 2*d = 10; frame 11 → 1
    expect(pingPongFrame(11, d)).toBe(1);
    expect(pingPongFrame(20, d)).toBe(0);
  });

  it('zero duration returns 0', () => {
    expect(pingPongFrame(50, 0)).toBe(0);
  });

  it('is deterministic', () => {
    expect(pingPongFrame(17, 60)).toBe(pingPongFrame(17, 60));
  });
});

describe('variableSpeedFrame (BF-509)', () => {
  const segs: SpeedSegment[] = [
    { start: 0, end: 24, speed: 1 },
    { start: 24, end: 48, speed: 2 },
  ];

  it('segment 1 is normal speed (identity)', () => {
    expect(variableSpeedFrame(0, segs)).toBe(0);
    expect(variableSpeedFrame(23, segs)).toBe(23);
  });

  it('segment 2 is 2× speed (source advances 2 frames per composition frame)', () => {
    // at frame 24: accumulated = 24 (segment 1), local = 0 → 24
    expect(variableSpeedFrame(24, segs)).toBe(24);
    // at frame 25: accumulated = 24, local = 1/2 = 0.5 → 24.5 → 24 (floor in timeWarpFrame, but raw here)
    expect(variableSpeedFrame(25, segs)).toBe(24.5);
    // at frame 47: accumulated = 24, local = 23/2 = 11.5 → 35.5
    expect(variableSpeedFrame(47, segs)).toBe(35.5);
  });

  it('empty segments = identity', () => {
    expect(variableSpeedFrame(10, [])).toBe(10);
  });

  it('past all segments continues at last speed', () => {
    const s: SpeedSegment[] = [{ start: 0, end: 10, speed: 2 }];
    // accumulated = 5; extra = 15-10=5; 5/2=2.5 → 7.5
    expect(variableSpeedFrame(15, s)).toBe(7.5);
  });
});

describe('layerFrame (BF-509 polyrhythmic)', () => {
  it('12fps layer on 24fps timeline', () => {
    expect(layerFrame(0, 24, 12)).toBe(0);
    expect(layerFrame(1, 24, 12)).toBe(0);
    expect(layerFrame(2, 24, 12)).toBe(1);
    expect(layerFrame(3, 24, 12)).toBe(1);
    expect(layerFrame(4, 24, 12)).toBe(2);
  });

  it('6fps UI overlay on 24fps timeline', () => {
    expect(layerFrame(0, 24, 6)).toBe(0);
    expect(layerFrame(3, 24, 6)).toBe(0);
    expect(layerFrame(4, 24, 6)).toBe(1);
  });

  it('higher layer fps (48 on 24)', () => {
    expect(layerFrame(0, 24, 48)).toBe(0);
    expect(layerFrame(1, 24, 48)).toBe(2);
  });

  it('zero fps returns 0', () => {
    expect(layerFrame(5, 24, 0)).toBe(0);
    expect(layerFrame(5, 0, 12)).toBe(0);
  });
});

describe('layerTimeline (BF-509)', () => {
  const tl = layerTimeline({ baseFps: 24, layers: { fg: 24, bg: 12, ui: 6 } });

  it('resolves per-layer frames', () => {
    expect(tl.at(48, 'fg')).toBe(48);
    expect(tl.at(48, 'bg')).toBe(24);
    expect(tl.at(48, 'ui')).toBe(12);
  });

  it('throws on unknown layer', () => {
    expect(() => tl.at(48, 'oops')).toThrow(/unknown layer/);
  });
});

describe('timeWarpFrame (BF-509+510 combined)', () => {
  it('reverse + ping-pong pipeline', () => {
    // reverse 60→0 then ping-pong with duration 30
    // frame 0: reverse → 60, pingPong(60, 30): period=60, t=0 → 0? No:
    // pingPongFrame(60, 30): period=60, t=60%60=0 → 0
    // frame 1: reverse → 59, pingPong(59, 30): t=59 → period-t=60-59=1
    expect(timeWarpFrame(0, { reverse: [60, 0], pingPongDuration: 30 })).toBe(0);
    expect(timeWarpFrame(1, { reverse: [60, 0], pingPongDuration: 30 })).toBe(1);
  });

  it('variable speed only', () => {
    const segs: SpeedSegment[] = [{ start: 0, end: 100, speed: 2 }];
    expect(timeWarpFrame(10, { segments: segs })).toBe(5);
  });

  it('no options = identity (floored)', () => {
    expect(timeWarpFrame(42, {})).toBe(42);
  });
});
