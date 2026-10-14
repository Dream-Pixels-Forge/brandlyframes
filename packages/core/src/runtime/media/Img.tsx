/**
 * `<Img>` — the frame-stable image primitive (BF-007). A thin, deterministic
 * wrapper around the native `<img>`: identical props at frame N always
 * produce an identical tree, in Studio previews and in the renderer. No
 * playback engine, no lifecycle logic — the P3 renderer auto-holds the frame
 * until images have loaded (BF-423 extends this component).
 */

import type { FC, ImgHTMLAttributes } from 'react';

export type ImgProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** Image source — usually built with `staticFile()`. */
  src: string;
};

/**
 * Renders an `<img>` with all props passed through. Frame-independent by
 * design (an image looks the same at every frame).
 */
export const Img: FC<ImgProps> = (props) => <img {...props} />;
