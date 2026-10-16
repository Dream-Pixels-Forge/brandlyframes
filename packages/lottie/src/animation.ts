/**
 * @brandlyframes/lottie — animation timing / playback controller.
 *
 * Frame-accurate playback state machine for Lottie animations, driven by
 * the BrandlyFrames composition frame clock.
 */

import type { AnimationModel, LottieControls } from './types';

/** Internal playback state. */
interface PlaybackState {
  model: AnimationModel;
  isPlaying: boolean;
  speed: number;
  loop: boolean;
  direction: 1 | -1;
  frame: number;
  startTime: number; // performance.now() when play started
  startFrame: number; // frame at play start
}

/** Create a playback controller for a model. */
export function createLottiePlayer(model: AnimationModel): LottieControls {
  const state: PlaybackState = {
    model,
    isPlaying: false,
    speed: 1,
    loop: true,
    direction: 1,
    frame: 0,
    startTime: 0,
    startFrame: 0,
  };

  const listeners: Array<(controls: LottieControls) => void> = [];
  let rafId: number | null = null;

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const totalFrames = state.model.durationInFrames;
  const fps = state.model.fps;

  const getFrameFromTime = (): number => {
    if (!state.isPlaying) return state.frame;
    const elapsed = (now() - state.startTime) / 1000; // seconds
    const frames = elapsed * fps * state.speed * state.direction;
    let frame = state.startFrame + frames;

    if (state.loop) {
      const span = Math.max(totalFrames, 1);
      frame = ((frame % span) + span) % span;
    } else {
      frame = Math.min(Math.max(frame, 0), totalFrames);
      if (frame >= totalFrames || frame <= 0) {
        state.isPlaying = false;
        cancelFrame();
        notify();
        return state.frame;
      }
    }

    state.frame = frame;
    return frame;
  };

  const cancelFrame = () => {
    if (rafId !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(rafId);
      }
      rafId = null;
    }
  };

  const tick = () => {
    if (!state.isPlaying) return;
    getFrameFromTime();
    notify();
    rafId = requestAnimationFrame(tick);
  };

  const notify = () => {
    const controls = readControls();
    for (const cb of listeners) cb(controls);
  };

  const readControls = (): LottieControls => {
    const controls: LottieControls = {
      get frame() {
        return Math.round(state.frame);
      },
      totalFrames,
      get time() {
        return state.frame / fps;
      },
      duration: totalFrames / fps,
      get isPlaying() {
        return state.isPlaying;
      },
      isLoaded: true,
      play: () => {
        if (state.isPlaying) return;
        state.isPlaying = true;
        state.startTime = now();
        state.startFrame = state.frame;
        cancelFrame();
        rafId = requestAnimationFrame(tick);
        notify();
      },
      pause: () => {
        if (!state.isPlaying) return;
        state.isPlaying = false;
        state.frame = getFrameFromTime();
        cancelFrame();
        notify();
      },
      seekFrame: (frame: number) => {
        state.frame = Math.min(Math.max(frame, 0), totalFrames);
        state.isPlaying = false;
        cancelFrame();
        notify();
      },
      seekTime: (time: number) => {
        state.frame = Math.min(Math.max(time * fps, 0), totalFrames);
        state.isPlaying = false;
        cancelFrame();
        notify();
      },
      goToMarker: (name: string): boolean => {
        const marker = state.model.markers.find((m) => m.name === name);
        if (!marker) return false;
        state.frame = marker.time * fps;
        state.isPlaying = false;
        cancelFrame();
        notify();
        return true;
      },
      get markers(): string[] {
        return state.model.markers.map((m) => m.name);
      },
      setSpeed: (speed: number) => {
        // Apply current frame before changing speed to avoid jumps.
        state.frame = getFrameFromTime();
        state.speed = speed;
        if (state.isPlaying) {
          state.startTime = now();
          state.startFrame = state.frame;
        }
        notify();
      },
      setLoop: (loop: boolean) => {
        state.loop = loop;
        notify();
      },
      destroy: () => {
        state.isPlaying = false;
        cancelFrame();
        listeners.length = 0;
      },
      onChange: (cb: (controls: LottieControls) => void) => {
        listeners.push(cb);
        return () => {
          const idx = listeners.indexOf(cb);
          if (idx >= 0) listeners.splice(idx, 1);
        };
      },
      fps,
    };
    return controls;
  };

  return readControls();
}

/** Resolve a marker name to a frame. */
export function markerToFrame(
  model: AnimationModel,
  name: string,
): number | null {
  const marker = model.markers.find((m) => m.name === name);
  return marker ? marker.time * model.fps : null;
}
