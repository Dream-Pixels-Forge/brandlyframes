/**
 * @brandlyframes/lottie — Lottie React component.
 *
 * Renders a Bodymovin/Lottie JSON animation on a canvas, driven by the
 * BrandlyFrames composition frame clock. Throws a helpful error when used
 * outside a <FrameContextProvider> (mounted automatically by <Composition>).
 */

import type { FC } from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { useCurrentFrame, useVideoConfig } from 'brandlyframes';
import type {
  AnimationModel,
  LottieAnimation,
  LottieControls,
  LottieProps,
} from './types';
import { createLottiePlayer, markerToFrame } from './animation';
import { parseAnimation } from './parser';
import { renderLottieFrame } from './renderer';

export { createLottiePlayer, markerToFrame } from './animation';
export { parseAnimation } from './parser';
export { renderLottieFrame } from './renderer';

/** Load a lottie animation from a URL. */
export async function loadAnimation(url: string): Promise<LottieAnimation> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load lottie animation from ${url}: ${res.status}`);
  }
  return (await res.json()) as LottieAnimation;
}

/**
 * Lottie component.
 *
 * @example
 * ```tsx
 * <Lottie animation={myJson} width={400} height={400} loop />
 * ```
 */
export const Lottie: FC<LottieProps> = ({
  animation,
  autoplay = true,
  loop = true,
  speed = 1,
  direction = 1,
  renderer = 'canvas',
  width,
  height,
  onLoad,
  onFrame,
  onComplete,
  className,
  canvasRef,
}) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<LottieControls | null>(null);
  const modelRef = useRef<AnimationModel | null>(null);
  const frameRef = useRef<number>(0);

  // Resolve animation (object or fetch URL).
  const animRef = useRef<LottieAnimation | null>(null);
  if (typeof animation === 'string') {
    // Lazy fetch handled in effect below.
  } else {
    animRef.current = animation;
  }

  const frame = useCurrentFrame();
  const video = useVideoConfig();

  const draw = useCallback(() => {
    const canvas = canvasEl.current;
    if (!canvas || !modelRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size canvas.
    const w = width ?? modelRef.current.width;
    const h = height ?? modelRef.current.height;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    renderLottieFrame(ctx, modelRef.current, frameRef.current);
    if (onFrame) onFrame(frameRef.current);
  }, [width, height, onFrame]);

  useEffect(() => {
    // Parse animation once loaded.
    const init = async () => {
      let anim: LottieAnimation;
      if (typeof animation === 'string') {
        anim = await loadAnimation(animation);
      } else {
        anim = animation;
      }
      animRef.current = anim;
      modelRef.current = parseAnimation(anim);
      playerRef.current = createLottiePlayer(modelRef.current);
      playerRef.current!.setSpeed(speed);
      playerRef.current!.setLoop(loop);

      // Drive playback from composition frame (BrandlyFrames owns the clock).
      playerRef.current!.seekFrame(frame);
      frameRef.current = frame;
      draw();

      if (autoplay) playerRef.current!.play();
      if (onLoad) onLoad(modelRef.current!);
    };

    init();

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
      modelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation]);

  // Sync to composition frame each render.
  useEffect(() => {
    if (!modelRef.current || !playerRef.current) return;
    frameRef.current = frame;
    playerRef.current.seekFrame(frame);
    draw();
  }, [frame]);

  // Apply speed/loop changes.
  useEffect(() => {
    if (!playerRef.current) return;
    playerRef.current.setSpeed(speed);
    playerRef.current.setLoop(loop);
  }, [speed, loop]);

  return (
    <canvas
      ref={canvasEl}
      className={className}
      width={width ?? 0}
      height={height ?? 0}
      style={{ display: 'block', ...(width ? { width } : {}), ...(height ? { height } : {}) }}
    />
  );
};

/** Hook exposing imperative lottie playback controls. */
export function useLottie(animation: LottieAnimation | string): LottieControls {
  const controlsRef = useRef<LottieControls | null>(null);
  const frame = useCurrentFrame();
  const video = useVideoConfig();

  useEffect(() => {
    const init = async () => {
      let anim: LottieAnimation;
      if (typeof animation === 'string') {
        anim = await loadAnimation(animation);
      } else {
        anim = animation;
      }
      const model = parseAnimation(anim);
      const controls = createLottiePlayer(model);
      controls.setSpeed(1);
      controls.seekFrame(frame);
      controlsRef.current = controls;
    };

    init();

    return () => {
      controlsRef.current?.destroy();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation]);

  // Derive read-only state from ref.
  return {
    get frame() {
      return controlsRef.current ? controlsRef.current.frame : 0;
    },
    get totalFrames() {
      return controlsRef.current ? controlsRef.current.totalFrames : 0;
    },
    get time() {
      return controlsRef.current ? controlsRef.current.time : 0;
    },
    get duration() {
      return controlsRef.current ? controlsRef.current.duration : 0;
    },
    get isPlaying() {
      return controlsRef.current ? controlsRef.current.isPlaying : false;
    },
    get isLoaded() {
      return controlsRef.current != null;
    },
    get markers() {
      return controlsRef.current ? controlsRef.current.markers : [];
    },
    get fps() {
      return controlsRef.current ? controlsRef.current.fps : 0;
    },
    onChange: (cb: (controls: LottieControls) => void) =>
      controlsRef.current?.onChange(cb) ?? (() => {}),
    play: () => controlsRef.current?.play(),
    pause: () => controlsRef.current?.pause(),
    seekFrame: (f: number) => controlsRef.current?.seekFrame(f),
    seekTime: (t: number) => controlsRef.current?.seekTime(t),
    goToMarker: (name: string) => controlsRef.current?.goToMarker(name) ?? false,
    setSpeed: (s: number) => controlsRef.current?.setSpeed(s),
    setLoop: (l: boolean) => controlsRef.current?.setLoop(l),
    destroy: () => controlsRef.current?.destroy(),
  };
}
