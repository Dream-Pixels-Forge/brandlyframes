/**
 * `<Video>` — the frame-driven video primitive (BF-007). Thin, deterministic
 * wrapper around the native `<video>`: the frame-derived playback time is
 * exposed on the rendered tree (`data-current-time`, in seconds) so the same
 * frame always produces the same output. Auto-holds the current frame until
 * the video has loaded (`loadeddata`) — on load, error or the hold timeout
 * the hold is released, so the renderer never blocks a frame forever
 * (BF-423). The hold is named `video <src>` so a timeout or leak report
 * names the exact asset and component. No playback engine yet — P3 mounts
 * real playback here, and P5's `<FrameVideo>` adds exact-frame decoding
 * (BF-450 will auto-promote this component in render mode).
 */

import type { FC, VideoHTMLAttributes } from 'react';
import { useEffect, useRef } from 'react';
import { autoHoldFrame } from '../../utils/auto-hold';
import { useCurrentFrame } from '../../hooks';
import { useVideoConfig } from '../../hooks';

/**
 * Default hold timeout for `<Video>`: 30 seconds of virtual time during a
 * render (BF-420 patches `setTimeout`) and 30 wall-clock seconds in a
 * browser — plenty for any video, but never forever.
 */
export const DEFAULT_VIDEO_TIMEOUT_IN_MILLISECONDS = 30_000;

export type VideoProps = VideoHTMLAttributes<HTMLVideoElement> & {
  /** Video source — usually built with `staticFile()`. */
  src: string;
};

/**
 * Renders a `<video>` whose playback time is derived from the current
 * frame: `frame / fps` (Sequence-relative — inside a `<Sequence>` the child
 * frame drives the time). Auto-holds the frame until the video loads.
 * Must be rendered inside a frame context.
 */
export const Video: FC<VideoProps> = (props) => {
  const { src } = props;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const videoEl = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoEl.current;
    // HAVE_CURRENT_DATA (2): enough of the video has loaded to render the
    // current frame — nothing to hold for. Referenced as a literal so the
    // component stays SSR-safe (no DOM globals touched outside the effect).
    if (!el || el.readyState >= 2) {
      return undefined;
    }
    let resolveLoaded!: () => void;
    let rejectLoaded!: (error: unknown) => void;
    const acquire = (): Promise<void> =>
      new Promise((resolve, reject) => {
        resolveLoaded = resolve;
        rejectLoaded = reject;
      });
    const onLoaded = (): void => {
      resolveLoaded();
    };
    const onError = (): void => {
      rejectLoaded(new Error(`<Video>: failed to load video "${src}"`));
    };
    el.addEventListener('loadeddata', onLoaded, { once: true });
    el.addEventListener('error', onError, { once: true });
    autoHoldFrame(`video ${src}`, acquire, {
      timeoutInMilliseconds: DEFAULT_VIDEO_TIMEOUT_IN_MILLISECONDS,
    });
    return () => {
      el.removeEventListener('loadeddata', onLoaded);
      el.removeEventListener('error', onError);
    };
  }, [src]);

  return <video ref={videoEl} {...props} data-current-time={frame / fps} />;
};
