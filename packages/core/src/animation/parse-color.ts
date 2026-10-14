/**
 * CSS color string parsing for `interpolateColors` — pure string math, no
 * React, no DOM. Supports the formats Remotion users rely on: hex (3/4/6/8
 * digits), `rgb()` / `rgba()` (comma, space and slash syntax) and a curated
 * table of common named colors (lowercase CSS keywords, including
 * `transparent` and the gray/grey aliases).
 */

/** Channels 0–255, alpha 0–1. */
export type RgbaColor = readonly [number, number, number, number];

/**
 * Common named colors. Values are the CSS keyword definitions; keys are
 * lowercase and looked up case-insensitively. Kept as a flat table so a
 * lookup is one property access.
 */
const NAMED_COLORS: Record<string, RgbaColor> = {
  transparent: [0, 0, 0, 0],
  aliceblue: [240, 248, 255, 1],
  antiquewhite: [250, 235, 215, 1],
  aqua: [0, 255, 255, 1],
  aquamarine: [127, 255, 212, 1],
  azure: [240, 255, 255, 1],
  beige: [245, 245, 220, 1],
  bisque: [255, 228, 196, 1],
  black: [0, 0, 0, 1],
  blanchedalmond: [255, 235, 205, 1],
  blue: [0, 0, 255, 1],
  blueviolet: [138, 43, 226, 1],
  brown: [165, 42, 42, 1],
  burlywood: [222, 184, 135, 1],
  cadetblue: [95, 158, 160, 1],
  chartreuse: [127, 255, 0, 1],
  chocolate: [210, 105, 30, 1],
  coral: [255, 127, 80, 1],
  cornflowerblue: [100, 149, 237, 1],
  crimson: [220, 20, 60, 1],
  cyan: [0, 255, 255, 1],
  darkblue: [0, 0, 139, 1],
  darkcyan: [0, 139, 139, 1],
  darkgoldenrod: [184, 134, 11, 1],
  darkgray: [169, 169, 169, 1],
  darkgreen: [0, 100, 0, 1],
  darkgrey: [169, 169, 169, 1],
  darkkhaki: [189, 183, 107, 1],
  darkmagenta: [139, 0, 139, 1],
  darkolivegreen: [85, 107, 47, 1],
  darkorange: [255, 140, 0, 1],
  darkorchid: [153, 50, 204, 1],
  darkred: [139, 0, 0, 1],
  darksalmon: [233, 150, 122, 1],
  darkseagreen: [143, 188, 143, 1],
  darkslateblue: [72, 61, 139, 1],
  darkslategray: [47, 79, 79, 1],
  darkslategrey: [47, 79, 79, 1],
  darkturquoise: [0, 206, 209, 1],
  darkviolet: [148, 0, 211, 1],
  deeppink: [255, 20, 147, 1],
  deepskyblue: [0, 191, 255, 1],
  dimgray: [105, 105, 105, 1],
  dimgrey: [105, 105, 105, 1],
  dodgerblue: [30, 144, 255, 1],
  firebrick: [178, 34, 34, 1],
  floralwhite: [255, 250, 240, 1],
  forestgreen: [34, 139, 34, 1],
  fuchsia: [255, 0, 255, 1],
  gainsboro: [220, 220, 220, 1],
  ghostwhite: [248, 248, 255, 1],
  gold: [255, 215, 0, 1],
  goldenrod: [218, 165, 32, 1],
  gray: [128, 128, 128, 1],
  green: [0, 128, 0, 1],
  greenyellow: [173, 255, 47, 1],
  grey: [128, 128, 128, 1],
  honeydew: [240, 255, 240, 1],
  hotpink: [255, 105, 180, 1],
  indianred: [205, 92, 92, 1],
  indigo: [75, 0, 130, 1],
  ivory: [255, 255, 240, 1],
  khaki: [240, 230, 140, 1],
  lavender: [230, 230, 250, 1],
  lavenderblush: [255, 240, 245, 1],
  lawngreen: [124, 252, 0, 1],
  lemonchiffon: [255, 250, 205, 1],
  lightblue: [173, 216, 230, 1],
  lightcoral: [240, 128, 128, 1],
  lightcyan: [224, 255, 255, 1],
  lightgoldenrodyellow: [250, 250, 210, 1],
  lightgray: [211, 211, 211, 1],
  lightgreen: [144, 238, 144, 1],
  lightgrey: [211, 211, 211, 1],
  lightpink: [255, 182, 193, 1],
  lightsalmon: [255, 160, 122, 1],
  lightseagreen: [32, 178, 170, 1],
  lightskyblue: [135, 206, 250, 1],
  lightslategray: [119, 136, 153, 1],
  lightslategrey: [119, 136, 153, 1],
  lightsteelblue: [176, 196, 222, 1],
  lightyellow: [255, 255, 224, 1],
  lime: [0, 255, 0, 1],
  limegreen: [50, 205, 50, 1],
  linen: [250, 240, 230, 1],
  magenta: [255, 0, 255, 1],
  maroon: [128, 0, 0, 1],
  mediumaquamarine: [102, 205, 170, 1],
  mediumblue: [0, 0, 205, 1],
  mediumorchid: [186, 85, 211, 1],
  mediumpurple: [147, 112, 219, 1],
  mediumseagreen: [60, 179, 113, 1],
  mediumslateblue: [123, 104, 238, 1],
  mediumspringgreen: [0, 250, 154, 1],
  mediumturquoise: [72, 209, 204, 1],
  mediumvioletred: [199, 21, 133, 1],
  midnightblue: [25, 25, 112, 1],
  mintcream: [245, 255, 250, 1],
  mistyrose: [255, 228, 225, 1],
  moccasin: [255, 228, 181, 1],
  navajowhite: [255, 222, 173, 1],
  navy: [0, 0, 128, 1],
  oldlace: [253, 245, 230, 1],
  olive: [128, 128, 0, 1],
  olivedrab: [107, 142, 35, 1],
  orange: [255, 165, 0, 1],
  orangered: [255, 69, 0, 1],
  orchid: [218, 112, 214, 1],
  palegoldenrod: [238, 232, 170, 1],
  palegreen: [152, 251, 152, 1],
  paleturquoise: [175, 238, 238, 1],
  palevioletred: [219, 112, 147, 1],
  papayawhip: [255, 239, 213, 1],
  peachpuff: [255, 218, 185, 1],
  peru: [205, 133, 63, 1],
  pink: [255, 192, 203, 1],
  plum: [221, 160, 221, 1],
  powderblue: [176, 224, 230, 1],
  purple: [128, 0, 128, 1],
  rebeccapurple: [102, 51, 153, 1],
  red: [255, 0, 0, 1],
  rosybrown: [188, 143, 143, 1],
  royalblue: [65, 105, 225, 1],
  saddlebrown: [139, 69, 19, 1],
  salmon: [250, 128, 114, 1],
  sandybrown: [244, 164, 96, 1],
  seagreen: [46, 139, 87, 1],
  seashell: [255, 245, 238, 1],
  sienna: [160, 82, 45, 1],
  silver: [192, 192, 192, 1],
  skyblue: [135, 206, 235, 1],
  slateblue: [106, 90, 205, 1],
  slategray: [112, 128, 144, 1],
  slategrey: [112, 128, 144, 1],
  snow: [255, 250, 250, 1],
  springgreen: [0, 255, 127, 1],
  steelblue: [70, 130, 180, 1],
  tan: [210, 180, 140, 1],
  teal: [0, 128, 128, 1],
  thistle: [216, 191, 216, 1],
  tomato: [255, 99, 71, 1],
  turquoise: [64, 224, 208, 1],
  violet: [238, 130, 238, 1],
  wheat: [245, 222, 179, 1],
  white: [255, 255, 255, 1],
  whitesmoke: [245, 245, 245, 1],
  yellow: [255, 255, 0, 1],
  yellowgreen: [154, 205, 50, 1],
};

const HEX_PATTERN = /^#?([0-9a-f]{3,8})$/;

const parseHex = (body: string): RgbaColor | null => {
  if (body.length !== 3 && body.length !== 4 && body.length !== 6 && body.length !== 8) return null;
  const expand = (digits: string): string =>
    digits
      .split('')
      .map((digit) => digit + digit)
      .join('');
  const full = body.length <= 4 ? expand(body) : body;
  const channel = (hex: string): number => parseInt(hex, 16);
  const r = channel(full.slice(0, 2));
  const g = channel(full.slice(2, 4));
  const b = channel(full.slice(4, 6));
  const a = full.length === 8 ? channel(full.slice(6, 8)) / 255 : 1;
  return [r, g, b, a];
};

const FUNCTION_PATTERN = /^rgba?\(([^)]+)\)$/;

const parseFunction = (body: string): RgbaColor | null => {
  const parts = body
    .replace(/\//g, ',')
    .split(/[\s,]+/)
    .filter((part) => part.length > 0);
  if (parts.length !== 3 && parts.length !== 4) return null;
  const channels = parts.map((part) => Number(part));
  if (channels.some((value) => !Number.isFinite(value))) return null;
  const [r, g, b] = channels;
  const a = channels.length === 4 ? channels[3] : 1;
  return [r, g, b, a];
};

/**
 * Parses a CSS color string into `[r, g, b, a]`. Throws a descriptive error
 * for anything unsupported — invalid colors must fail loudly, never render
 * as `NaN`.
 */
export const parseColor = (color: string): RgbaColor => {
  if (typeof color !== 'string') {
    throw new Error(`Color must be a string, but got ${typeof color} (${String(color)}).`);
  }
  const trimmed = color.trim().toLowerCase();

  const hexMatch = HEX_PATTERN.exec(trimmed);
  if (hexMatch) {
    const parsed = parseHex(hexMatch[1]);
    if (parsed) return validateChannels(parsed, color);
  }

  const functionMatch = FUNCTION_PATTERN.exec(trimmed);
  if (functionMatch) {
    const parsed = parseFunction(functionMatch[1]);
    if (parsed) return validateChannels(parsed, color);
  }

  const named = NAMED_COLORS[trimmed];
  if (named) return named;

  throw new Error(
    `Unsupported color ${JSON.stringify(color)}: expected hex (e.g. '#ff8800'), rgb()/rgba() or a common named color.`,
  );
};

const validateChannels = (color: RgbaColor, source: string): RgbaColor => {
  const [r, g, b, a] = color;
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    throw new Error(`Color ${JSON.stringify(source)} has channels outside [0, 255].`);
  }
  if (a < 0 || a > 1) {
    throw new Error(`Color ${JSON.stringify(source)} has alpha outside [0, 1].`);
  }
  return color;
};
