/**
 * Pixel access + prefetch [BF-058] — decoded frames as data, N-ahead
 * prefetch planning, and a framework-free hold→load→release effect.
 */
export interface VideoFrameData {
  src: string;
  sourceFrame: number;
  width: number;
  height: number;
  bitmap: unknown;
}
export type VideoFrameLoader = (src: string, sourceFrame: number) => Promise<VideoFrameData>;
export type HoldFn = (name: string) => number;
export type ReleaseFn = (handle: number) => void;
export interface MountVideoFrameEffectOptions {
  readonly loader: VideoFrameLoader;
  readonly hold: HoldFn;
  readonly release: ReleaseFn;
  readonly onReady?: (frame: VideoFrameData) => void;
  readonly onError?: (error: unknown) => void;
}
export type VideoFrameEffectCleanup = () => void;
export const planPrefetchFrames = (
  current: number,
  length: number,
  ahead: number,
  isCached?: (sourceFrame: number) => boolean,
): number[] => {
  if (!Number.isSafeInteger(current) || current < 0) {
    throw new Error(`current must be a non-negative safe integer, got ${current}`);
  }
  if (!Number.isSafeInteger(length) || length < 1) {
    throw new Error(`length must be a positive safe integer, got ${length}`);
  }
  if (!Number.isSafeInteger(ahead) || ahead < 0) {
    throw new Error(`ahead must be a non-negative safe integer, got ${ahead}`);
  }
  const plan: number[] = [];
  for (let f = current + 1; f <= current + ahead && f < length; f += 1) {
    if (isCached?.(f) === true) {
      continue;
    }
    plan.push(f);
  }
  return plan;
};
export const mountVideoFrameEffect = (
  src: string,
  sourceFrame: number,
  options: MountVideoFrameEffectOptions,
): VideoFrameEffectCleanup => {
  if (typeof src !== 'string' || src.length === 0) {
    throw new Error('src must be a non-empty string');
  }
  if (!Number.isSafeInteger(sourceFrame) || sourceFrame < 0) {
    throw new Error(`sourceFrame must be a non-negative safe integer, got ${sourceFrame}`);
  }
  if (typeof options.loader !== 'function') {
    throw new Error('loader must be a function');
  }
  if (typeof options.hold !== 'function' || typeof options.release !== 'function') {
    throw new Error('hold and release must be functions');
  }
  
  // Hold first, then load - follow the hold→load→release pattern
  const handle = options.hold(`frame ${sourceFrame} (${src})`);
  const pending = options.loader(src, sourceFrame);
  let released = false;
  const releaseOnce = (): void => {
    if (released) {
      return;
    }
    released = true;
    options.release(handle);
  };
  let unmounted = false;
  pending.then(
    (frameData) => {
      releaseOnce();
      if (!unmounted) {
        options.onReady?.(frameData);
      }
    },
    (error: unknown) => {
      releaseOnce();
      if (!unmounted) {
        options.onError?.(error);
      }
    },
  );
  return () => {
    unmounted = true;
    releaseOnce();
  };
};
