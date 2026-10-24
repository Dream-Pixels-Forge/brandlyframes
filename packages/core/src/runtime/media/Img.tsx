import type { FC, ImgHTMLAttributes } from 'react';
import { useEffect } from 'react';
import { autoHoldFrame } from '../../utils/auto-hold';

/**
 * Default hold timeout for `<Img>`: 30 seconds of virtual time during a
 * render (BF-420 patches `setTimeout`) and 30 wall-clock seconds in a
 * browser — plenty for any image, but never forever.
 */
export const DEFAULT_IMG_TIMEOUT_IN_MILLISECONDS = 30_000;

export type ImgProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** Image source — usually built with `staticFile()`. */
  src: string;
};

/**
 * Renders an `` with all props passed through (frame-independent by
 * design) and holds the current frame until the image has loaded — on
 * load success, load failure or the hold timeout the hold is released, so
 * the renderer never captures a frame with a missing image and never
 * blocks a frame forever (BF-423). The hold is named `img <src>` so a
 * timeout or leak report names the exact asset and component.
 */
export const Img: FC<ImgProps> = (props) => {
  const { src } = props;
  useEffect(() => {
    const acquire = (): Promise<void> =>
      new Promise((resolve, reject) => {
        const imgEl = new Image();
        imgEl.onload = () => resolve();
        imgEl.onerror = () =>
          reject(new Error(`<Img>: failed to load image "${src}"`));
      });
    autoHoldFrame(`img ${src}`, acquire, {
      timeoutInMilliseconds: DEFAULT_IMG_TIMEOUT_IN_MILLISECONDS,
    });
  }, [src]);
  return <img {...props} />;
};
