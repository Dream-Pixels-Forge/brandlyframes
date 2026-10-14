/**
 * Frame-driven media primitives (BF-007): deterministic `<Img>`, `<Audio>`
 * and `<Video>` render trees. Thin by design — P3 (renderer) and P5
 * (frame-exact video) extend them.
 */
export { Audio, type AudioProps } from './Audio';
export { Img, type ImgProps } from './Img';
export { Video, type VideoProps } from './Video';
