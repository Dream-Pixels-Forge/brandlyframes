/**
 * @brandlyframes/fx — cinematic effects for BrandlyFrames.
 *
 * All effects are pure, deterministic functions over RGBA pixel data
 * (`Uint8ClampedArray`, row-major). The same input always yields the same
 * output, so previews and renders match (`frame -> pixels`). No GPU or
 * browser APIs are required — the pixel math runs in Node and render
 * workers, and the results can be drawn to a canvas or encoded by the
 * renderer.
 *
 * Effect descriptions:
 * - `applyFilmGrain` — seeded per-pixel noise (monochrome or per-channel)
 * - `applyLensDistortion` — radial distortion with bilinear resampling
 * - `applyBloom` — threshold-extract + blur + additive glow
 * - `applyBlendMode` — normal / multiply / screen / overlay between two frames
 * - `loadLut` / `applyLut` — 1D color-grading lookup with linear interpolation
 * - `compose` — shader-layer API: chains effects into a single frame function
 */
/** RGBA pixels for a single frame: width * height * 4 bytes, row-major. */
export type FramePixels = Uint8ClampedArray;
/** A deterministic 1D color-grading lookup table. */
export type Lut = {
    /** Human-readable name of the LUT. */
    readonly name: string;
    /** Number of entries (size of `data`). */
    readonly size: number;
    /** Normalized lookup values, one per entry (0..1). */
    readonly data: Float32Array;
};
export type FilmGrainOptions = {
    /** Noise strength, 0 (none) to 1 (strong). */
    readonly intensity: number;
    /** When true, apply the same noise to all color channels. */
    readonly monochrome: boolean;
};
export type LensDistortionOptions = {
    /** Radial distortion coefficient (positive = pincushion, negative = barrel). */
    readonly k1: number;
    /** Higher-order radial coefficient. */
    readonly k2: number;
    /** Distortion center, 0..1 (0.5 = image center). */
    readonly centerX: number;
    readonly centerY: number;
};
export type BloomOptions = {
    /** Luminance threshold (0..1) above which pixels contribute to the glow. */
    readonly threshold: number;
    /** Glow strength, 0 (none) to 1 (strong). */
    readonly intensity: number;
    /** Blur radius in pixels. */
    readonly radius: number;
};
export type BlendModeOptions = {
    /** Blend mode: normal, multiply, screen, or overlay. */
    readonly mode: 'normal' | 'multiply' | 'screen' | 'overlay';
    /** Opacity of the top layer, 0 (bottom only) to 1 (top only). */
    readonly opacity: number;
};
export type EffectStep = {
    readonly name: 'filmGrain';
    readonly options: FilmGrainOptions;
} | {
    readonly name: 'lensDistortion';
    readonly options: LensDistortionOptions;
} | {
    readonly name: 'bloom';
    readonly options: BloomOptions;
} | {
    readonly name: 'blendMode';
    readonly options: BlendModeOptions & {
        readonly top: FramePixels;
    };
} | {
    readonly name: 'lut';
    readonly options: {
        readonly lut: Lut;
    };
};
/**
 * Adds film-grain noise to a frame.
 *
 * @param pixels - RGBA pixel data (width * height * 4)
 * @param width - frame width in pixels
 * @param height - frame height in pixels
 * @param options - intensity (0..1) and monochrome flag
 * @returns new RGBA pixel data (input is not mutated)
 */
export declare const applyFilmGrain: (pixels: FramePixels, width: number, height: number, options: FilmGrainOptions) => FramePixels;
/**
 * Applies radial lens distortion to a frame using bilinear resampling.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - k1/k2 distortion coefficients and center
 * @returns new RGBA pixel data (input is not mutated)
 */
export declare const applyLensDistortion: (pixels: FramePixels, width: number, height: number, options: LensDistortionOptions) => FramePixels;
/**
 * Adds an additive glow to bright pixels (threshold-based bloom).
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - threshold (0..1), intensity (0..1), radius (pixels)
 * @returns new RGBA pixel data (input is not mutated)
 */
export declare const applyBloom: (pixels: FramePixels, width: number, height: number, options: BloomOptions) => FramePixels;
/**
 * Blends two frames pixel-by-pixel.
 *
 * @param bottom - base RGBA pixel data
 * @param top - overlay RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - mode and opacity
 * @returns new RGBA pixel data (inputs are not mutated)
 */
export declare const applyBlendMode: (bottom: FramePixels, top: FramePixels, width: number, height: number, options: BlendModeOptions) => FramePixels;
/**
 * Loads a 1D color-grading LUT from a binary buffer of normalized floats
 * (little-endian), one entry per channel value.
 */
export declare const loadLut: (buffer: ArrayBuffer) => Lut;
/**
 * Applies a 1D LUT to a frame, mapping each color channel through the lookup
 * table with linear interpolation.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param lut - the lookup table
 * @returns new RGBA pixel data (input is not mutated)
 */
export declare const applyLut: (pixels: FramePixels, width: number, height: number, lut: Lut) => FramePixels;
/**
 * Chains effects into a single deterministic frame function — the shader
 * layer API. Each step is applied in order; the output of one feeds the
 * next. An empty composition returns its input unchanged.
 *
 * @param steps - effect steps to apply, in order
 * @returns `(pixels, width, height) => FramePixels`
 */
export declare const compose: (...steps: readonly EffectStep[]) => ((pixels: FramePixels, width: number, height: number) => FramePixels);
//# sourceMappingURL=fx.d.ts.map