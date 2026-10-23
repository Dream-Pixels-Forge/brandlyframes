/**
 * BF-241 — Time-travel frame history.
 * Ring buffer of already-rendered frames; stepping back/forward only moves
 * a cursor — no re-render — and `jump` targets frames such as the first error frame.
 */
export class FrameHistory {
  private readonly capacity: number;
  private buffer: number[] = [];
  private cursor = -1; // index into buffer; -1 = empty

  constructor(capacity = 100) {
    this.capacity = Math.max(1, Math.floor(capacity));
  }

  /** Records a rendered frame (dedupes consecutive re-renders) and snaps the cursor to it. */
  push(frame: number): void {
    if (this.buffer[this.buffer.length - 1] !== frame) {
      this.buffer.push(frame);
      if (this.buffer.length > this.capacity) this.buffer.shift();
    }
    this.cursor = this.buffer.length - 1;
  }

  get current(): number | null {
    return this.buffer[this.cursor] ?? null;
  }

  get size(): number {
    return this.buffer.length;
  }

  canBack(): boolean {
    return this.cursor > 0;
  }

  canForward(): boolean {
    return this.cursor < this.buffer.length - 1;
  }

  /** Steps back one recorded frame without re-rendering. Returns null at the oldest frame. */
  back(): number | null {
    if (!this.canBack()) return null;
    return this.buffer[--this.cursor];
  }

  /** Steps forward one recorded frame. Returns null at the newest frame. */
  forward(): number | null {
    if (!this.canForward()) return null;
    return this.buffer[++this.cursor];
  }

  /** Moves the cursor to `frame`; appends it first if it was never rendered. */
  jump(frame: number): void {
    const index = this.buffer.indexOf(frame);
    if (index >= 0) {
      this.cursor = index;
    } else {
      this.push(frame);
    }
  }

  entries(): readonly number[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer = [];
    this.cursor = -1;
  }
}
