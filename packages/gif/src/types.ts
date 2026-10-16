/**
 * @brandlyframes/gif — shared public types [BF-071]
 */

/** One encodable animation frame. */
export interface GifFrameInput {
  /** Row-major RGBA pixels, `width * height * 4` entries. */
  rgba: Uint8ClampedArray;
  /** Frame delay in hundredths of a second. */
  delayCentiseconds: number;
}

/** Options accepted by `encodeGif`. */
export interface EncodeGifOptions {
  width: number;
  height: number;
  /** Frames to encode (at least one). */
  frames: GifFrameInput[];
  /** NETSCAPE loop count (`0` = infinite, the default). */
  loopCount?: number;
}

/** A decoded GIF frame. */
export interface GifFrame {
  /** Palette indices, row-major `width * height` entries. */
  indices: Uint8Array;
  /** Frame delay in hundredths of a second. */
  delayCentiseconds: number;
  /** Index treated as transparent by this frame (`null` when none). */
  transparentIndex: number | null;
  /** Frame-local palette when the image block carries one (else `null`). */
  localPalette: Uint8Array | null;
  /** Disposal method of the preceding graphic control extension. */
  disposal: number;
}

/** A fully decoded GIF. */
export interface DecodedGif {
  width: number;
  height: number;
  /** Global color table as flat RGB triplets. */
  globalPalette: Uint8Array;
  frames: GifFrame[];
  /** NETSCAPE loop count (`0` = loop forever / unspecified). */
  loopCount: number;
}
