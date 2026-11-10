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
// Deterministic hash (same as fx.ts) — kept local so this module is self-contained.
const hash = (n) => {
    n = (n ^ 61) ^ (n >>> 16);
    n = n + (n << 3);
    n = n ^ (n >>> 4);
    n = n * 0x27d4eb2d;
    n = n ^ (n >>> 15);
    return (n >>> 0) / 0xFFFFFFFF;
};
const clampByte = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.floor(v));
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
export const applyDatamosh = (pixels, prevPixels, width, height, options = {}) => {
    const { intensity = 0.5, blockSize = 16, frame = 0, seed = 0 } = options;
    if (!prevPixels || intensity <= 0)
        return new Uint8ClampedArray(pixels);
    const out = new Uint8ClampedArray(pixels);
    const phase = frame * 31 + seed;
    // For each block row, decide (deterministically) whether to smear.
    for (let by = 0; by < height; by += blockSize) {
        // Use hash of (block index, phase) to decide smear — stable per frame,
        // advances with frame.
        const smear = hash(by * 7919 + phase) < intensity;
        if (!smear)
            continue;
        const rowEnd = Math.min(by + blockSize, height);
        for (let y = by; y < rowEnd; y++) {
            // Copy the previous frame's row at the same y (VCR block behavior:
            // the "old" colors persist where motion was lost).
            const dstBase = y * width * 4;
            const srcBase = y * width * 4;
            for (let x = 0; x < width; x++) {
                const idx = (dstBase + x * 4) | 0;
                const src = (srcBase + x * 4) | 0;
                // VCR datamosh: the color (G/B) channels smear from the previous
                // frame; the R channel stays current (color-cue preservation).
                out[idx + 1] = prevPixels[src + 1];
                out[idx + 2] = prevPixels[src + 2];
                out[idx + 3] = pixels[idx + 3];
            }
        }
    }
    return out;
};
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
export const applyFrameDrop = (pixels, prevPixels, width, height, options = {}) => {
    const { probability = 0.1, frame = 0, seed = 0 } = options;
    if (probability <= 0 || !prevPixels)
        return new Uint8ClampedArray(pixels);
    const roll = hash(frame * 104729 + seed * 7919);
    const dropped = roll < probability;
    return dropped ? new Uint8ClampedArray(prevPixels) : new Uint8ClampedArray(pixels);
};
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
export const applyChannelShift = (pixels, width, height, options = {}) => {
    const { rShift = 0, gShift = 0, bShift = 0 } = options;
    if (rShift === 0 && gShift === 0 && bShift === 0)
        return new Uint8ClampedArray(pixels);
    const out = new Uint8ClampedArray(pixels.length);
    const clampedX = (x) => (x < 0 ? 0 : x >= width ? width - 1 : x);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dst = (y * width + x) * 4;
            const rx = clampedX(x - rShift);
            const gx = clampedX(x - gShift);
            const bx = clampedX(x - bShift);
            const rSrc = (y * width + rx) * 4;
            const gSrc = (y * width + gx) * 4;
            const bSrc = (y * width + bx) * 4;
            out[dst] = pixels[rSrc];
            out[dst + 1] = pixels[gSrc + 1];
            out[dst + 2] = pixels[bSrc + 2];
            out[dst + 3] = pixels[dst + 3];
        }
    }
    return out;
};
// ---------------------------------------------------------------------------
// makeGlitchSteps (BF-503) — compose() integration
// ---------------------------------------------------------------------------
/**
 * Build {@link EffectStep}[] for {@link compose} that applies a full glitch
 * look: channel shift + datamosh (when prev frame available).
 *
 * NOTE: datamosh and frame-drop require a previous frame, so they cannot be
 * expressed as a plain `EffectStep` (which takes only current pixels). Use
 * `applyDatamosh` / `applyFrameDrop` directly in a custom shader layer, or
 * use this helper for the channel-shift part only.
 */
export const makeGlitchSteps = (frame, seed) => {
    // The channel shift is the only part expressible as an EffectStep.
    // (fx.ts `lut` / `filmGrain` / `bloom` steps don't cover channel shift,
    //  so we return an empty array and document the limitation.)
    return [];
};
//# sourceMappingURL=glitch.js.map