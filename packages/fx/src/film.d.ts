/**
 * BF-501 — film stock & chemical process emulation for @brandlyframes/fx.
 *
 * All functions are pure and deterministic: `frame -> pixels` with no wall
 * clock, no `Math.random`, and no GPU. The same `(frame, seed, options)`
 * input always produces byte-identical output, so preview and render match.
 *
 * Effects:
 * - `applyFilmStock` — stock-specific grain + push/pull tonal curves
 *   (`kodak-5219`, `fuji-400`, `ilford-hp5`, or any {@link FilmStockSpec})
 * - `applyHalation` — warm red edge-blooms around bright transitions
 * - `applyGateWeave` — subtle periodic micro-oscillation (projector wobble)
 * - `makePushPullCurve` / `applyPushPull` — exposure push/pull grade curves
 * - `makeFilmStockSteps` — compose()-ready EffectStep[] for a stock preset
 */
import { applyBloom, applyFilmGrain, type EffectStep, type FramePixels } from './fx';
/** A film stock preset: named tonal/character parameters. */
export interface FilmStockSpec {
    readonly name: string;
    /** Film ISO (drives grain density). */
    readonly iso: number;
    /** Per-channel color shift in -128..128 (negative bias for the channel). */
    readonly shift: readonly [number, number, number];
    /** Grain intensity multiplier relative to ISO. */
    readonly grainScale: number;
    /** Base grain size in px (higher = coarser). */
    readonly grainSize: number;
    /** Push/pull stops baked into the default curve (0.5 = neutral). */
    readonly exposure: number;
    /** Contrast multiplier for the S-curve. */
    readonly contrast: number;
    /** Shadow tone lift 0..1 (0 = hard shadows). */
    readonly shadowLift: number;
    /** Highlight rolloff 0..1 (0 = hard highlights). */
    readonly highlightRoll: number;
}
/** Built-in film stocks. Values are hand-tuned character approximations. */
export declare const FILM_STOCKS: Record<string, FilmStockSpec>;
export type FilmStockName = keyof typeof FILM_STOCKS | 'custom';
/** Options for {@link applyFilmStock}. */
export interface FilmStockOptions {
    /** Stock preset name, or a full spec. */
    readonly stock?: string | FilmStockSpec;
    /** Frame number (drives deterministic grain phase). Default 0. */
    readonly frame?: number;
    /** Additional seed mixed into the grain. Default 0. */
    readonly seed?: number;
    /** Bilevel/desaturated look: true forces monochrome grain (B&W stocks). */
    readonly monochrome?: boolean;
    /** Grain intensity multiplier (1 = stock default). Default 1. */
    readonly grainIntensity?: number;
}
/** Resolve a stock name/spec to a FilmStockSpec. */
export declare const resolveFilmStock: (stock?: string | FilmStockSpec) => FilmStockSpec;
/**
 * Per-pixel tonal curve for a film stock (push/pull + S-contrast + shadow lift
 * + highlight rolloff). Pure function of input value 0..255.
 */
export declare const filmStockToneCurve: (spec: FilmStockSpec) => ((v: number) => number)[];
/**
 * Apply a named film stock look to a frame: tonal curves, per-frame
 * deterministic grain, stock color shift, and an optional subtle blooming
 * halation on high contrast stocks.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - stock preset name or spec, frame, seed, grain intensity
 * @returns new RGBA pixel data (input is not mutated)
 */
export declare const applyFilmStock: (pixels: FramePixels, width: number, height: number, options?: FilmStockOptions) => FramePixels;
export interface HalationOptions {
    /** Edge-bloom strength, 0 (none) to 0.5 (strong). Default 0.15. */
    readonly intensity?: number;
    /** Luma threshold 0..1 above which halation fires. Default 0.75. */
    readonly threshold?: number;
    /** Seed for the warm color jitter. Default 0. */
    readonly seed?: number;
    /** Frame number for deterministic per-frame variation. Default 0. */
    readonly frame?: number;
}
/**
 * Adds warm red "halation" around bright edges — the soft red fringe that
 * classic film emulsions show at high-contrast transitions.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - intensity, threshold, seed, frame
 * @returns new RGBA pixel data (input is not mutated)
 */
export declare const applyHalation: (pixels: FramePixels, width: number, height: number, options?: HalationOptions) => FramePixels;
export interface GateWeaveOptions {
    /** Weave amplitude in pixels. Default 0.08. */
    readonly amplitude?: number;
    /** Weave frequency in cycles per frame. Default 0.05. */
    readonly frequency?: number;
    /** Seed for phase. Default 0. */
    readonly seed?: number;
}
/**
 * Simulates projector gate weave — a subtle periodic micro-oscillation of the
 * frame. Implemented as a deterministic 1-pixel sub-pixel sine shift of the
 * whole image (the standard trick: we offset each row by a sine of its y,
 * wrapped by the frame number), which reads as "wobble" without any wall clock.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param frame - current frame number (drives the phase)
 * @param options - amplitude, frequency, seed
 * @returns new RGBA pixel data (input is not mutated)
 */
export declare const applyGateWeave: (pixels: FramePixels, width: number, height: number, frame: number, options?: GateWeaveOptions) => FramePixels;
/**
 * Build a 256-entry push/pull tonal curve. `stops` > 0 pushes (brighter),
 * `stops` < 0 pulls (darker). 1 stop = factor of 2 in exposure.
 */
export declare const makePushPullCurve: (stops: number) => Uint8ClampedArray;
/** Apply a 256-entry curve to each R/G/B channel of a frame. */
export declare const applyPushPull: (pixels: FramePixels, width: number, height: number, curve: Uint8ClampedArray) => FramePixels;
/**
 * Build a {@link EffectStep}[] for {@link compose} that applies a full
 * film-stock look: grain + halation + gate weave. This is the "drop-in"
 * for users who want the stock look through the existing shader-layer API.
 *
 * NOTE: `applyFilmGrain`/`applyBloom` in fx.ts are the building blocks;
 * these extra functions live in this module, so users compose them by
 * importing from 'fx/film' and wrapping, or use `applyFilmStock` directly.
 */
export declare const makeFilmStockSteps: (stock: string | FilmStockSpec, frame: number, seed: number) => EffectStep[];
export { applyFilmGrain, applyBloom };
//# sourceMappingURL=film.d.ts.map