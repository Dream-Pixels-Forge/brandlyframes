/**
 * BF-503 — glitch & datamoshing effects for @brandlyframes/fx.
 *
 * All effects are pure and deterministic: `frame -> pixels` with a seed. No
 * `Math.random`, no wall clock, no GPU. The same `(pixels, frame, seed, options)`
 * input always produces byte-identical output, so preview and render match.
 *
 * Effects:
 * - `applyDatamosh` — block-copy previous-frame rows into the current frame
 *   (simulates VCR datamosh: motion data lost, colors smear downward)
 * - `applyFrameDrop` — probabilistic (seeded) frame hold: "drop" every Nth
 *   frame by copying the previous frame, producing stutter
 * - `applyChannelShift` — per-channel horizontal offset (chromatic aberration)
 * - `makeGlitchSteps` — compose()-ready EffectStep[] wrapper
 */
import type { EffectStep, FramePixels } from './fx';
export interface DatamoshOptions {
    /**
     * Smear strength, 0 (none) to 1 (full block copy). Default 0.5.
     * Higher = more rows are replaced by the previous-frame row.
     */
    readonly intensity?: number;
    /**
     * Block size in pixels (VCR block height). Default 16.
     * Smaller blocks = finer smear, larger = chunkier.
     */
    readonly blockSize?: number;
    /** Frame number (drives which rows smear). Default 0. */
    readonly frame?: number;
    /** Seed for deterministic row selection. Default 0. */
    readonly seed?: number;
}
/**
 * Applies a datamosh effect: for a subset of rows (determined by seed + frame),
 * the row is replaced by the row from `prevPixels` at the same y-offset,
 * simulating lost motion data (the "color smear" VCR artifact).
 *
 * If `prevPixels` is `null`, the current frame is returned unchanged.
 *
 * @param pixels - current frame RGBA pixel data
 * @param prevPixels - previous frame RGBA pixel data, or null for first frame
 * @param width - frame width
 * @param height - frame height
 * @param options - intensity, blockSize, frame, seed
 * @returns new RGBA pixel data (input is not mutated)
 */
export declare const applyDatamosh: (pixels: FramePixels, prevPixels: FramePixels | null, width: number, height: number, options?: DatamoshOptions) => FramePixels;
export interface FrameDropOptions {
    /**
     * Drop probability, 0 (never drop) to 1 (always drop). Default 0.1.
     * "Drop" means: hold the previous frame instead of advancing.
     */
    readonly probability?: number;
    /** Frame number (drives the drop decision). Default 0. */
    readonly frame?: number;
    /** Seed. Default 0. */
    readonly seed?: number;
}
/**
 * Simulates frame drops: at a given frame, if the seeded random value
 * exceeds (1 - probability), the frame is "held" — the caller should pass
 * `prevPixels` and this function returns a copy of it instead of `pixels`.
 *
 * This is the "stutter" effect: frames appear to freeze periodically.
 *
 * @param pixels - current frame
 * @param prevPixels - previous frame (held when a drop is triggered)
 * @param width - frame width
 * @param height - frame height
 * @param options - probability, frame, seed
 * @returns either a copy of `pixels` (no drop) or `prevPixels` (drop)
 */
export declare const applyFrameDrop: (pixels: FramePixels, prevPixels: FramePixels | null, width: number, height: number, options?: FrameDropOptions) => FramePixels;
export interface ChannelShiftOptions {
    /**
     * Horizontal shift in pixels for the R channel. Positive = right.
     * Default 2.
     */
    readonly rShift?: number;
    /**
     * Horizontal shift in pixels for the G channel. Default 0.
     */
    readonly gShift?: number;
    /**
     * Horizontal shift in pixels for the B channel. Default -2.
     */
    readonly bShift?: number;
}
/**
 * Applies per-channel horizontal offset (chromatic aberration / "broken video"
 * color fringing). Pixels that shift out of bounds are clamped to the edge.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - rShift, gShift, bShift
 * @returns new RGBA pixel data (input is not mutated)
 */
export declare const applyChannelShift: (pixels: FramePixels, width: number, height: number, options?: ChannelShiftOptions) => FramePixels;
/**
 * Build {@link EffectStep}[] for {@link compose} that applies a full glitch
 * look: channel shift + datamosh (when prev frame available).
 *
 * NOTE: datamosh and frame-drop require a previous frame, so they cannot be
 * expressed as a plain `EffectStep` (which takes only current pixels). Use
 * `applyDatamosh` / `applyFrameDrop` directly in a custom shader layer, or
 * use this helper for the channel-shift part only.
 */
export declare const makeGlitchSteps: (frame: number, seed: number) => EffectStep[];
//# sourceMappingURL=glitch.d.ts.map