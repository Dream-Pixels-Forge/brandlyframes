/**
 * BF-303 live mode — LiveServer: ticks a running composition on a wall-time
 * deterministic clock and pushes each frame to an injectable transport.
 *
 * Drift-free scheduling: the next tick is always scheduled at the ABSOLUTE
 * frame-grid boundary (`startedAt + (k+1) * framePeriod`), never relative to
 * the previous tick, so timer jitter cannot accumulate — 60 fps stays 60 fps
 * over an hour. The frame shown is derived from the clock via
 * {@link frameAt}, not from the tick index.
 *
 * Output adapters (NDI, WebRTC, browser-source WS, test mocks) all implement
 * {@link LiveTransport}; nothing else in the server knows how frames travel.
 */
import { frameAt, type LiveClock, wallClock } from './live-clock';

/** A frame pushed to live outputs: frame number plus wall-time stamp. */
export interface LiveFrameMessage {
  readonly frame: number;
  readonly elapsedMs: number;
}

/**
 * Output adapter for live frames. Implementations: the browser-source
 * HTTP/WebSocket endpoint ({@link HttpLiveTransport}), NDI and WebRTC
 * adapters, and mock transports in tests.
 */
export interface LiveTransport {
  /** Open outputs (bind ports, start sessions). Called once per start. */
  start(): Promise<void>;
  /** Close outputs. Called once per stop. */
  stop(): Promise<void>;
  /** Push the frame now showing on the wall-time clock. */
  sendFrame(message: LiveFrameMessage): void;
}

/** Timer surface so tests can drive ticks on a mocked clock (BF-303). */
export interface LiveTimers {
  set(callback: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
}

const nodeTimers: LiveTimers = {
  set: (callback, delayMs) => setTimeout(callback, delayMs),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface LiveServerOptions {
  /** Frames per second of the live output (e.g. 60). Positive. */
  readonly fps: number;
  /** Composition length in frames; the live output loops within it. Positive. */
  readonly durationInFrames: number;
  /** Wall-time source. Default: {@link wallClock}. Tests inject a mock. */
  readonly clock?: LiveClock;
  /** Timer source. Default: node timers. Tests inject a mock. */
  readonly timers?: LiveTimers;
  /** Output adapter (browser-source endpoint, NDI/WebRTC adapter, mock). */
  readonly transport: LiveTransport;
}

/**
 * Drives a live overlay: each frame-period tick maps current wall time to
 * the frame that must be on screen and pushes it to the transport.
 */
export class LiveServer {
  private readonly fps: number;
  private readonly durationInFrames: number;
  private readonly clock: LiveClock;
  private readonly timers: LiveTimers;
  private readonly transport: LiveTransport;

  private running = false;
  private startedAtMs = 0;
  private tickIndex = 0;
  private pendingHandle: unknown;

  constructor(options: LiveServerOptions) {
    if (!(options.fps > 0) || !(options.durationInFrames > 0)) {
      throw new RangeError(
        `LiveServer: fps and durationInFrames must be positive (got fps=${options.fps}, durationInFrames=${options.durationInFrames})`,
      );
    }
    this.fps = options.fps;
    this.durationInFrames = options.durationInFrames;
    this.clock = options.clock ?? wallClock;
    this.timers = options.timers ?? nodeTimers;
    this.transport = options.transport;
  }

  /** Open the transport and begin ticking on the wall-time grid. */
  async start(): Promise<void> {
    if (this.running) throw new Error('LiveServer: already started');
    this.running = true;
    await this.transport.start();
    this.startedAtMs = this.clock();
    this.tickIndex = 0;
    this.scheduleNextTick();
  }

  /** Cancel pending ticks and close the transport. Idempotent. */
  async stop(): Promise<void> {
    this.running = false;
    if (this.pendingHandle !== undefined) {
      this.timers.clear(this.pendingHandle);
      this.pendingHandle = undefined;
    }
    await this.transport.stop();
  }

  private scheduleNextTick(): void {
    if (!this.running) return;
    // Absolute grid position of the NEXT tick — jitter-proof (BF-303).
    // Multiply before dividing: integer k keeps the grid FP-exact so ticks
    // land exactly on frame boundaries (no cumulative drift at hour scale).
    const dueAt = this.startedAtMs + ((this.tickIndex + 1) * 1000) / this.fps;
    const delayMs = Math.max(0, dueAt - this.clock());
    this.pendingHandle = this.timers.set(() => this.tick(), delayMs);
  }

  private tick(): void {
    if (!this.running) return;
    this.tickIndex += 1;
    const elapsedMs = this.clock() - this.startedAtMs;
    this.transport.sendFrame({
      frame: frameAt(elapsedMs, this.fps, this.durationInFrames),
      elapsedMs,
    });
    this.scheduleNextTick();
  }
}
