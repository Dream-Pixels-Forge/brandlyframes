/**
 * BF-303 live mode — LiveServer tick engine.
 *
 * Acceptance: 60 fps for 1 hour without drift. Validated with an
 * ACCELERATED MOCKED clock (ManualClock/ManualTimers below) — never a real
 * hour. Transport is the injectable mock; NDI/WebRTC adapters implement the
 * same LiveTransport interface.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { LiveServer, type LiveTimers, type LiveTransport } from '../../src/live-server';
import { wallClock } from '../../src/live-clock';

/** Deterministic mock clock: `now()` is pure simulation time in ms. */
class ManualClock {
  private t = 0;
  readonly now = (): number => this.t;
  advance(ms: number): void {
    this.t += ms;
  }
}

/**
 * Deterministic mock timers keyed to ManualClock. Callbacks fire in strict
 * due-time order while `advance` moves time forward (handles fractional ms,
 * unlike real timer granularity).
 */
class ManualTimers implements LiveTimers {
  private queue: { at: number; cb: () => void; cancelled: boolean }[] = [];
  private ptr = 0;

  constructor(private readonly clock: ManualClock) {}

  set(cb: () => void, delayMs: number): { cancelled: boolean } {
    const entry = { at: this.clock.now() + delayMs, cb, cancelled: false };
    this.queue.push(entry);
    return entry;
  }

  clear(handle: { cancelled: boolean }): void {
    handle.cancelled = true;
  }

  /** Fire every callback due within the next `ms` of simulated time. */
  advance(ms: number): void {
    const target = this.clock.now() + ms;
    // Ticks are scheduled in increasing due order (one per frame period).
    while (this.ptr < this.queue.length && this.queue[this.ptr].at <= target) {
      const entry = this.queue[this.ptr++];
      this.clock.advance(entry.at - this.clock.now());
      if (!entry.cancelled) entry.cb();
    }
    this.clock.advance(target - this.clock.now());
  }
}

interface RecordedFrame {
  frame: number;
  elapsedMs: number;
}

/** Mock transport (BF-303: transports injectable + mocked). */
function mockTransport() {
  const frames: RecordedFrame[] = [];
  const transport: LiveTransport & { frames: RecordedFrame[]; started: boolean; stopped: boolean } = {
    frames,
    started: false,
    stopped: false,
    async start() {
      transport.started = true;
    },
    async stop() {
      transport.stopped = true;
    },
    sendFrame(message) {
      frames.push(message);
    },
  };
  return transport;
}

const FPS = 60;
const HOUR_MS = 60 * 60 * 1000;

function runLiveHour(durationInFrames: number) {
  const clock = new ManualClock();
  const timers = new ManualTimers(clock);
  const transport = mockTransport();
  const server = new LiveServer({
    fps: FPS,
    durationInFrames,
    clock: clock.now,
    timers,
    transport,
  });
  return { clock, timers, transport, server };
}

describe('LiveServer (BF-303)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts the transport and derives the first frame from wall time', async () => {
    const { timers, transport, server } = runLiveHour(300);
    const done = server.start();
    timers.advance(0);
    await done;
    expect(transport.started).toBe(true);
    timers.advance(1000 / FPS); // one frame period
    expect(transport.frames).toHaveLength(1);
    expect(transport.frames[0]).toEqual({ frame: 1, elapsedMs: 1000 / FPS });
    await server.stop();
  });

  it('60fps for 1 simulated hour without drift (accelerated mock clock)', async () => {
    const durationInFrames = 300; // 5s loop → 720 loops over the hour
    const { timers, transport, server } = runLiveHour(durationInFrames);
    await server.start();

    // Simulate the full hour in 60s chunks (60 chunks × 60s).
    for (let chunk = 0; chunk < 60; chunk++) {
      timers.advance(60_000);
    }

    const frames = transport.frames;
    // One broadcast per frame period, none skipped, none repeated:
    expect(frames).toHaveLength(HOUR_MS * (FPS / 1000)); // 216000

    // Zero drift at every point of the hour: the served frame must equal the
    // frame derived independently from the broadcast's own wall-time stamp.
    for (let i = 0; i < frames.length; i++) {
      const { frame, elapsedMs } = frames[i];
      const expected = Math.floor((elapsedMs * FPS) / 1000) % durationInFrames;
      if (frame !== expected) {
        throw new Error(
          `drift at broadcast ${i}: served frame ${frame}, wall time implies ${expected} (elapsed ${elapsedMs}ms)`,
        );
      }
      // Ticks must stay locked to the absolute frame grid (no cumulative lag).
      const expectedElapsed = ((i + 1) * 1000) / FPS;
      if (Math.abs(elapsedMs - expectedElapsed) > 1e-6) {
        throw new Error(
          `tick pacing at broadcast ${i}: elapsed ${elapsedMs}ms, expected ${expectedElapsed}ms`,
        );
      }
    }

    // Hour boundary: exactly frame 0 again (216000 % 300), hour-accurate.
    const last = frames[frames.length - 1];
    expect(last.elapsedMs).toBeCloseTo(HOUR_MS, 6);
    expect(last.frame).toBe(0);

    await server.stop();
  });

  it('stop() cancels pending ticks and stops the transport', async () => {
    const { timers, transport, server } = runLiveHour(300);
    await server.start();
    timers.advance(1000 / FPS);
    expect(transport.frames.length).toBe(1);
    await server.stop();
    timers.advance(HOUR_MS);
    expect(transport.frames).toHaveLength(1); // no broadcasts after stop
    expect(transport.stopped).toBe(true);
  });

  it('works with the default wall clock and node timers (small-scale)', async () => {
    vi.useFakeTimers();
    const transport = mockTransport();
    const server = new LiveServer({
      fps: 100, // 10ms period → 50 broadcasts in 500ms of faked wall time
      durationInFrames: 1000,
      clock: wallClock,
      transport,
    });
    await server.start();
    vi.advanceTimersByTime(500);
    expect(transport.frames.length).toBe(50);
    const last = transport.frames[transport.frames.length - 1];
    expect(last.frame).toBe(Math.floor((last.elapsedMs * 100) / 1000) % 1000);
    await server.stop();
    const countAfterStop = transport.frames.length;
    vi.advanceTimersByTime(1000);
    expect(transport.frames.length).toBe(countAfterStop);
  });

  it('rejects non-positive fps and duration', () => {
    expect(() => new LiveServer({ fps: 0, durationInFrames: 300, transport: mockTransport() })).toThrow(
      RangeError,
    );
    expect(() => new LiveServer({ fps: 60, durationInFrames: -1, transport: mockTransport() })).toThrow(
      RangeError,
    );
  });
});
