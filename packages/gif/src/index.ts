/**
 * @brandlyframes/gif — GIF89a export/import [BF-071]
 *
 * Pure-TypeScript GIF codec: `Uint8Array` in, `Uint8Array` out, no canvas,
 * no browser globals — fully Node-testable. See `encode.ts`, `decode.ts`,
 * `lzw.ts`, `palette.ts` for the implementation and `types.ts` for the
 * shared public types.
 */

export type { GifFrameInput, EncodeGifOptions, GifFrame, DecodedGif } from './types';
export { encodeGif } from './encode';
export { parseGif, gifFrameToRgba } from './decode';
export { mapGifFrameIndex } from './gif-frame-index';
export { AnimatedImage, type AnimatedImageProps } from './AnimatedImage';
export { lzwEncode, lzwDecode } from './lzw';
export { buildPalette, paddedPalette, quantizeToPalette, rgbKey } from './palette';
