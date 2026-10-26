/**
 * Warm render server (BF-474).
 *
 * Persistent pool interface with pre-launched workers (browser slot +
 * pre-loaded bundle) to remove cold-start time, a priority queue, and
 * autoscaling hooks. `InMemoryWarmPool` is the reference mock: no real
 * browsers, all timing injectable — launch work goes through an injectable
 * `launchFn` and the default path completes synchronously so pools are
 * usable right after construction.
 */

/** A pooled render worker (browser slot + loaded bundle). */
export interface WarmWorker {
  /** Unique worker id (per pool). */
  readonly id: string;
  /** Lifecycle state. */
  state: 'warming' | 'idle' | 'busy' | 'disposed';
  /** Bundle pre-loaded into this worker (`null` = none yet). */
  bundleId: string | null;
  /** Mocked-clock launch timestamp (ms since pool epoch). */
  readonly launchedAtMs: number;
}

/** Pool counters snapshot. */
export interface WarmPoolStats {
  /** Workers alive (warming + idle + busy). */
  readonly warm: number;
  /** Idle workers ready to serve. */
  readonly idle: number;
  /** Busy workers. */
  readonly busy: number;
  /** Acquire calls waiting for a worker. */
  readonly queued: number;
  /** Configured pool bounds. */
  readonly minWarm: number;
  readonly maxWarm: number;
}

/** Autoscaling hooks (BF-474): fired when the pool grows or shrinks. */
export interface WarmPoolHooks {
  /** Called after new workers entered the pool (ids of launched workers). */
  readonly onScaleUp?: (workerIds: readonly string[]) => void;
  /** Called after idle workers above minWarm were disposed (their ids). */
  readonly onScaleDown?: (workerIds: readonly string[]) => void;
}

/** Options for {@link InMemoryWarmPool}. */
export interface WarmPoolOptions {
  /** Workers kept warm when idle (default 1). */
  readonly minWarm?: number;
  /** Hard ceiling on warm workers (default 8). */
  readonly maxWarm?: number;
  /** Bundle pre-loaded at launch (default `null`). */
  readonly bundleId?: string | null;
  /** Mocked clock for `launchedAtMs` (default: monotonic ms counter). */
  readonly clock?: () => number;
  /**
   * Simulated cold-launch work (browser boot, bundle load). Workers stay in
   * `warming` state until it resolves. Default: immediate — workers are
   * `idle` as soon as the constructor returns.
   */
  readonly launchFn?: (worker: WarmWorker) => Promise<void>;
  /** Autoscaling hooks. */
  readonly hooks?: WarmPoolHooks;
}

/**
 * Persistent warm render pool (BF-474). Acquire hands out pre-warmed
 * workers; queued requests are served by priority (higher first, FIFO
 * within a priority).
 */
export interface WarmRenderPool {
  /** Take a warm worker (priority: higher numbers served first, default 0). */
  acquire(priority?: number): Promise<WarmWorker>;
  /** Return a worker to the pool (hands it to the next queued request). */
  release(worker: WarmWorker): void;
  /** (Re)load a bundle onto idle workers. */
  preloadBundle(bundleId: string): Promise<void>;
  /** Pool counters snapshot. */
  stats(): WarmPoolStats;
  /** Shut the pool down; queued acquirers reject. */
  dispose(): Promise<void>;
}

/** Error thrown when acquiring from a disposed pool. */
export class WarmPoolDisposedError extends Error {
  constructor() {
    super('warm render pool is disposed — create a new pool to render');
    this.name = 'WarmPoolDisposedError';
  }
}

/** One queued acquire call. */
interface QueuedAcquire {
  readonly priority: number;
  readonly order: number;
  resolve: (worker: WarmWorker) => void;
  reject: (error: Error) => void;
}

/** In-memory warm pool — reference implementation and test double. */
export class InMemoryWarmPool implements WarmRenderPool {
  private readonly workers = new Map<string, WarmWorker>();
  private readonly launchPromises = new Map<string, Promise<void>>();
  private readonly queue: QueuedAcquire[] = [];
  private readonly minWarm: number;
  private readonly maxWarm: number;
  private readonly initialBundleId: string | null;
  private readonly clock: () => number;
  private readonly launchFn: ((worker: WarmWorker) => Promise<void>) | null;
  private readonly hooks: WarmPoolHooks;
  private disposed = false;
  private workerCounter = 0;
  private enqueueCounter = 0;
  private epochMs = 0;

  constructor(options: WarmPoolOptions = {}) {
    this.minWarm = options.minWarm ?? 1;
    this.maxWarm = options.maxWarm ?? 8;
    if (this.minWarm < 0 || this.maxWarm < 1 || this.minWarm > this.maxWarm) {
      throw new RangeError(
        `InMemoryWarmPool: need 0 <= minWarm (${this.minWarm}) <= maxWarm (${this.maxWarm})`
      );
    }
    this.initialBundleId = options.bundleId ?? null;
    this.clock = options.clock ?? (() => ++this.epochMs);
    this.launchFn = options.launchFn ?? null;
    this.hooks = options.hooks ?? {};
    for (let i = 0; i < this.minWarm; i++) {
      this.spawnWorker(false);
    }
  }

  async acquire(priority: number = 0): Promise<WarmWorker> {
    if (this.disposed) {
      throw new WarmPoolDisposedError();
    }
    const idle = this.idleWorker();
    if (idle) {
      idle.state = 'busy';
      return idle;
    }
    if (this.workers.size < this.maxWarm) {
      // Scale up on demand instead of queueing. The worker is claimed for
      // this acquire at spawn time (never passes through `idle`), so a
      // concurrent acquire can never receive the same worker.
      const worker = this.spawnWorker(true);
      const launchPromise = this.launchPromises.get(worker.id);
      if (launchPromise) {
        await launchPromise;
      }
      if (this.disposed || worker.state === 'disposed') {
        throw new WarmPoolDisposedError();
      }
      return worker;
    }
    // Pool at capacity → priority queue (higher first, FIFO within).
    return new Promise<WarmWorker>((resolve, reject) => {
      this.enqueueCounter += 1;
      this.queue.push({ priority, order: this.enqueueCounter, resolve, reject });
      this.queue.sort((a, b) => b.priority - a.priority || a.order - b.order);
    });
  }

  release(worker: WarmWorker): void {
    if (this.disposed || worker.state === 'disposed' || !this.workers.has(worker.id)) {
      return;
    }
    const queued = this.queue.shift();
    if (queued) {
      worker.state = 'busy';
      queued.resolve(worker);
      return;
    }
    worker.state = 'idle';
    this.scaleDownIfAboveMin();
  }

  async preloadBundle(bundleId: string): Promise<void> {
    if (this.disposed) {
      throw new WarmPoolDisposedError();
    }
    const targets: WarmWorker[] = [];
    for (const worker of this.workers.values()) {
      if (worker.state === 'idle' || worker.state === 'warming') {
        targets.push(worker);
      }
    }
    // Pre-warm at least one worker when the pool is empty.
    if (targets.length === 0 && this.workers.size < this.maxWarm) {
      targets.push(await this.launchWorker());
    }
    for (const worker of targets) {
      worker.bundleId = bundleId;
    }
  }

  stats(): WarmPoolStats {
    let idle = 0;
    let busy = 0;
    for (const worker of this.workers.values()) {
      if (worker.state === 'idle') idle += 1;
      else if (worker.state === 'busy') busy += 1;
    }
    return {
      warm: this.workers.size,
      idle,
      busy,
      queued: this.queue.length,
      minWarm: this.minWarm,
      maxWarm: this.maxWarm,
    };
  }

  /** Peeks at an idle worker without acquiring it (inspection helper). */
  peekIdle(): WarmWorker | undefined {
    return this.idleWorker();
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    const pending = [...this.queue];
    this.queue.length = 0;
    for (const queued of pending) {
      queued.reject(new WarmPoolDisposedError());
    }
    for (const worker of this.workers.values()) {
      worker.state = 'disposed';
    }
    this.workers.clear();
    this.launchPromises.clear();
  }

  // -- internals -------------------------------------------------------------

  private idleWorker(): WarmWorker | undefined {
    for (const worker of this.workers.values()) {
      if (worker.state === 'idle') {
        return worker;
      }
    }
    return undefined;
  }

  /**
   * Creates a worker. `forAcquire` claims it for a waiting acquire: it goes
   * straight to `busy` when its launch finishes (never `idle`), so it can
   * never be handed to two acquires.
   */
  private spawnWorker(forAcquire: boolean): WarmWorker {
    this.workerCounter += 1;
    const worker: WarmWorker = {
      id: `warm-${this.workerCounter}`,
      state: this.launchFn ? 'warming' : forAcquire ? 'busy' : 'idle',
      bundleId: this.initialBundleId,
      launchedAtMs: this.clock(),
    };
    this.workers.set(worker.id, worker);
    if (this.launchFn) {
      const launchPromise = this.launchFn(worker).then(
        () => {
          if (this.disposed) {
            worker.state = 'disposed';
            this.workers.delete(worker.id);
            return;
          }
          worker.state = forAcquire ? 'busy' : 'idle';
          this.hooks.onScaleUp?.([worker.id]);
        },
        (error: unknown) => {
          worker.state = 'disposed';
          this.workers.delete(worker.id);
          throw error;
        }
      );
      this.launchPromises.set(worker.id, launchPromise);
      // Constructor-spawned launches must not surface as unhandled rejections.
      launchPromise.catch(() => undefined);
    } else {
      this.hooks.onScaleUp?.([worker.id]);
    }
    return worker;
  }

  /** Spawns an unclaimed worker and waits for its launch (throws on failure/dispose). */
  private async launchWorker(): Promise<WarmWorker> {
    const worker = this.spawnWorker(false);
    const launchPromise = this.launchPromises.get(worker.id);
    if (launchPromise) {
      await launchPromise;
    }
    if (this.disposed || worker.state === 'disposed') {
      throw new WarmPoolDisposedError();
    }
    return worker;
  }

  private scaleDownIfAboveMin(): void {
    const downscaled: string[] = [];
    while (this.idleCount() > this.minWarm) {
      const idle = this.idleWorker();
      if (!idle) break;
      idle.state = 'disposed';
      this.workers.delete(idle.id);
      downscaled.push(idle.id);
    }
    if (downscaled.length > 0) {
      this.hooks.onScaleDown?.(downscaled);
    }
  }

  private idleCount(): number {
    let count = 0;
    for (const worker of this.workers.values()) {
      if (worker.state === 'idle') count += 1;
    }
    return count;
  }
}
