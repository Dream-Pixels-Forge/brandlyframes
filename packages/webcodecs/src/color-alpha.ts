/**
 * @brandlyframes/webcodecs — alpha sources and color-space handling [BF-057]
 *
 * Pure, Node-testable helpers for describing a video stream's alpha channel
 * and color space from container/codec hints. No decoding here; these run on
 * codec strings and caller-known labels only.
 */

/**
 * Closed set of color spaces the probe path understands.
 *
 * - `'unknown'` — no (or unrecognized) color information was provided.
 * - `'srgb'` — sRGB (IEC 61966-2-1).
 * - `'bt709'` — ITU-R BT.709 / Rec.709 (HD SDR).
 * - `'bt2020'` — ITU-R BT.2020 / Rec.2020 (UHD wide gamut).
 * - `'display-p3'` — Display P3 (DCI-P3 primaries, D65 white point).
 */
export type ColorSpace = 'unknown' | 'srgb' | 'bt709' | 'bt2020' | 'display-p3';

/**
 * How an alpha channel is encoded when one is present.
 *
 * - `'opaque'` — no alpha channel; every pixel is fully opaque.
 * - `'premultiplied'` — color channels are pre-multiplied by alpha.
 * - `'straight'` — color channels are independent of alpha ("unassociated").
 */
export type AlphaMode = 'opaque' | 'premultiplied' | 'straight';

/**
 * Alpha-channel presence and encoding for a stream.
 */
export interface AlphaInfo {
  /** Whether the stream carries an alpha channel. */
  hasAlpha: boolean;
  /** How alpha is encoded when present; `null` when `hasAlpha` is `false`. */
  mode: AlphaMode | null;
}

/** Opaque (no-alpha) result shared by all non-alpha branches. */
const OPAQUE: AlphaInfo = { hasAlpha: false, mode: null };

/** ProRes 422 fourccs — video-only, never carry alpha. */
const PRORES_422 = new Set(['apcn', 'apcs', 'apco', 'apch']);

/** Opaque codec prefixes (matched case-insensitively after normalization). */
const OPAQUE_PREFIXES = ['avc1.', 'hev1.', 'hvc1.'];

/**
 * Infer alpha presence and encoding from a codec string.
 *
 * Matching is case-insensitive. Rules:
 * - VP9 with the alpha profile (the second dot-segment of a `vp09.*` string
 *   equals `'02'`) carries alpha. WebCodecs VP9-alpha frames are
 *   **premultiplied**, so this reports `{ hasAlpha: true, mode: 'premultiplied' }`.
 * - ProRes 4444 (`'ap4h'`) carries **straight** (unassociated) alpha.
 * - ProRes 422 variants (`'apcn'`, `'apcs'`, `'apco'`, `'apch'`), H.264/AVC
 *   (`'avc1.'`), H.265/HEVC (`'hev1.'`, `'hvc1.'`), non-alpha VP9 profiles
 *   (`'vp09.00'`, `'vp09.01'`), and VP8 (`'vp8'`) are opaque.
 * - Empty or unrecognized codec strings report `{ hasAlpha: false, mode: null }`.
 *
 * @param codec Codec string, e.g. `'vp09.02.10.10.01.09.16.09.0'`, `'ap4h'`
 * @returns Alpha presence and encoding; `mode` is `null` when no alpha
 */
export const detectAlphaFromCodec = (codec: string): AlphaInfo => {
  const normalized = codec.trim().toLowerCase();
  if (normalized === '') {
    return { ...OPAQUE };
  }
  const segments = normalized.split('.');
  if (segments[0] === 'vp09') {
    return segments[1] === '02' ? { hasAlpha: true, mode: 'premultiplied' } : { ...OPAQUE };
  }
  if (normalized === 'ap4h') {
    return { hasAlpha: true, mode: 'straight' };
  }
  if (normalized === 'vp8' || PRORES_422.has(normalized)) {
    return { ...OPAQUE };
  }
  for (const prefix of OPAQUE_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      return { ...OPAQUE };
    }
  }
  return { ...OPAQUE };
};

/**
 * Normalize a caller-provided color-space label to the closed {@link ColorSpace} union.
 *
 * Token map (case-insensitive, surrounding whitespace ignored):
 * - `'srgb'`, `'iec61966-2-1'` → `'srgb'`
 * - `'bt709'`, `'bt.709'`, `'rec709'`, `'rec.709'` → `'bt709'`
 * - `'bt2020'`, `'bt.2020'`, `'rec2020'`, `'rec.2020'` → `'bt2020'`
 * - `'display-p3'`, `'p3'`, `'displayp3'` → `'display-p3'`
 * - `undefined`, `''`/whitespace-only, or anything unrecognized → `'unknown'`
 *
 * @param value Raw color-space label, if any
 * @returns The matching {@link ColorSpace} token, or `'unknown'`
 */
export const parseColorSpace = (value: string | undefined): ColorSpace => {
  if (value === undefined) {
    return 'unknown';
  }
  switch (value.trim().toLowerCase()) {
    case 'srgb':
    case 'iec61966-2-1':
      return 'srgb';
    case 'bt709':
    case 'bt.709':
    case 'rec709':
    case 'rec.709':
      return 'bt709';
    case 'bt2020':
    case 'bt.2020':
    case 'rec2020':
    case 'rec.2020':
      return 'bt2020';
    case 'display-p3':
    case 'p3':
    case 'displayp3':
      return 'display-p3';
    default:
      return 'unknown';
  }
};

/**
 * A pixel with unpremultiplied sRGB channels, each an integer in `0..255`.
 */
export interface SrgbPixel {
  /** Red channel, `0..255`. */
  r: number;
  /** Green channel, `0..255`. */
  g: number;
  /** Blue channel, `0..255`. */
  b: number;
}

/**
 * A foreground pixel: unpremultiplied sRGB `0..255` channels plus alpha.
 */
export interface SrgbPixelWithAlpha extends SrgbPixel {
  /** Alpha channel, `0..255` (`0` = fully transparent, `255` = fully opaque). */
  a: number;
}

/**
 * Composite an unpremultiplied sRGB foreground over an sRGB background.
 *
 * Both inputs use **unpremultiplied** sRGB channels in `0..255`; the same
 * formula covers premultiplied-or-straight sources because the caller
 * supplies already-unpremultiplied channel values. Per channel:
 * `out = round(fg * a + bg * (1 - a))` with `a = fg.a / 255`.
 *
 * @param foreground Foreground pixel (unpremultiplied sRGB `0..255` + alpha `0..255`)
 * @param background Background pixel (sRGB `0..255`)
 * @returns Composited sRGB pixel with rounded `0..255` channels
 */
export const alphaBlendOver = (
  foreground: SrgbPixelWithAlpha,
  background: SrgbPixel,
): SrgbPixel => {
  const a = foreground.a / 255;
  const blend = (fg: number, bg: number): number => Math.round(fg * a + bg * (1 - a));
  return {
    r: blend(foreground.r, background.r),
    g: blend(foreground.g, background.g),
    b: blend(foreground.b, background.b),
  };
};
