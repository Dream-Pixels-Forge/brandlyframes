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
// ---------------------------------------------------------------------------
// Deterministic seeded noise (no Math.random — same input, same output)
// ---------------------------------------------------------------------------
const hash = (n) => {
    n = (n ^ 61) ^ (n >>> 16);
    n = n + (n << 3);
    n = n ^ (n >>> 4);
    n = n * 0x27d4eb2d;
    n = n ^ (n >>> 15);
    return (n >>> 0) / 0xFFFFFFFF;
};
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const lerp = (a, b, t) => a + (b - a) * t;
// ---------------------------------------------------------------------------
// applyFilmGrain
// ---------------------------------------------------------------------------
/**
 * Adds film-grain noise to a frame.
 *
 * @param pixels - RGBA pixel data (width * height * 4)
 * @param width - frame width in pixels
 * @param height - frame height in pixels
 * @param options - intensity (0..1) and monochrome flag
 * @returns new RGBA pixel data (input is not mutated)
 */
export const applyFilmGrain = (pixels, width, height, options) => {
    const { intensity = 0, monochrome = false } = options;
    const out = new Uint8ClampedArray(pixels);
    const strength = intensity * 255;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const base = (y * width + x) * 4;
            const mono = monochrome ? hash(base) : 0;
            for (let c = 0; c < 3; c++) {
                const noise = monochrome ? mono : hash(base * 3 + c);
                out[base + c] = clamp(out[base + c] + (noise - 0.5) * 2 * strength, 0, 255);
            }
        }
    }
    return out;
};
// ---------------------------------------------------------------------------
// applyLensDistortion
// ---------------------------------------------------------------------------
/**
 * Applies radial lens distortion to a frame using bilinear resampling.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - k1/k2 distortion coefficients and center
 * @returns new RGBA pixel data (input is not mutated)
 */
export const applyLensDistortion = (pixels, width, height, options) => {
    const { k1 = 0, k2 = 0, centerX = 0.5, centerY = 0.5 } = options;
    const out = new Uint8ClampedArray(pixels.length);
    const cx = centerX * width;
    const cy = centerY * height;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const r2 = (dx * dx + dy * dy) / Math.max(cx * cx + cy * cy, 1);
            const factor = 1 + k1 * r2 + k2 * r2 * r2;
            const sx = cx + dx * factor;
            const sy = cy + dy * factor;
            const i0 = clamp(Math.floor(sy), 0, height - 1);
            const i1 = clamp(Math.min(i0 + 1, height - 1), 0, height - 1);
            const j0 = clamp(Math.floor(sx), 0, width - 1);
            const j1 = clamp(Math.min(j0 + 1, width - 1), 0, width - 1);
            const ty = sy - i0;
            const tx = sx - j0;
            const base = (y * width + x) * 4;
            for (let c = 0; c < 4; c++) {
                const p00 = pixels[(i0 * width + j0) * 4 + c];
                const p01 = pixels[(i0 * width + j1) * 4 + c];
                const p10 = pixels[(i1 * width + j0) * 4 + c];
                const p11 = pixels[(i1 * width + j1) * 4 + c];
                out[base + c] = lerp(lerp(p00, p01, tx), lerp(p10, p11, tx), ty);
            }
        }
    }
    return out;
};
// ---------------------------------------------------------------------------
// applyBloom
// ---------------------------------------------------------------------------
/**
 * Adds an additive glow to bright pixels (threshold-based bloom).
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - threshold (0..1), intensity (0..1), radius (pixels)
 * @returns new RGBA pixel data (input is not mutated)
 */
export const applyBloom = (pixels, width, height, options) => {
    const { threshold = 0.5, intensity = 1, radius = 1 } = options;
    const out = new Uint8ClampedArray(pixels);
    const thresholdLuma = threshold * 255;
    // Extract bright pixels into a glow buffer (luminance-scaled).
    const glow = new Float32Array(pixels.length);
    for (let i = 0; i < pixels.length; i += 4) {
        const luma = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        if (luma > thresholdLuma) {
            const amount = (luma - thresholdLuma) / (255 - thresholdLuma) || 0;
            glow[i] = pixels[i] * amount;
            glow[i + 1] = pixels[i + 1] * amount;
            glow[i + 2] = pixels[i + 2] * amount;
        }
    }
    // Box-blur the glow buffer.
    if (radius > 0) {
        const r = Math.floor(radius);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const base = (y * width + x) * 4;
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    let count = 0;
                    for (let dy = -r; dy <= r; dy++) {
                        const yy = y + dy;
                        if (yy < 0 || yy >= height)
                            continue;
                        for (let dx = -r; dx <= r; dx++) {
                            const xx = x + dx;
                            if (xx < 0 || xx >= width)
                                continue;
                            sum += glow[(yy * width + xx) * 4 + c];
                            count++;
                        }
                    }
                    glow[base + c] = sum / Math.max(count, 1);
                }
            }
        }
    }
    // Add the scaled glow back, clamped.
    for (let i = 0; i < pixels.length; i += 4) {
        out[i] = clamp(out[i] + glow[i] * intensity, 0, 255);
        out[i + 1] = clamp(out[i + 1] + glow[i + 1] * intensity, 0, 255);
        out[i + 2] = clamp(out[i + 2] + glow[i + 2] * intensity, 0, 255);
    }
    return out;
};
// ---------------------------------------------------------------------------
// applyBlendMode
// ---------------------------------------------------------------------------
const channelBlend = (mode, bottom, top) => {
    const b = bottom / 255;
    const t = top / 255;
    let result;
    switch (mode) {
        case 'multiply':
            result = b * t;
            break;
        case 'screen':
            result = 1 - (1 - b) * (1 - t);
            break;
        case 'overlay':
            result = b < 0.5 ? 2 * b * t : 1 - 2 * (1 - b) * (1 - t);
            break;
        case 'normal':
        default:
            result = t;
            break;
    }
    return Math.round(result * 255);
};
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
export const applyBlendMode = (bottom, top, width, height, options) => {
    const { mode = 'normal', opacity = 1 } = options;
    const out = new Uint8ClampedArray(bottom);
    const alpha = clamp(opacity, 0, 1);
    for (let i = 0; i < bottom.length; i += 4) {
        const blended = channelBlend(mode, bottom[i], top[i]);
        out[i] = clamp(lerp(bottom[i], blended, alpha), 0, 255);
        const blended1 = channelBlend(mode, bottom[i + 1], top[i + 1]);
        out[i + 1] = clamp(lerp(bottom[i + 1], blended1, alpha), 0, 255);
        const blended2 = channelBlend(mode, bottom[i + 2], top[i + 2]);
        out[i + 2] = clamp(lerp(bottom[i + 2], blended2, alpha), 0, 255);
    }
    return out;
};
// ---------------------------------------------------------------------------
// loadLut / applyLut
// ---------------------------------------------------------------------------
/**
 * Loads a 1D color-grading LUT from a binary buffer of normalized floats
 * (little-endian), one entry per channel value.
 */
export const loadLut = (buffer) => {
    const data = new Float32Array(buffer);
    return {
        name: '',
        size: data.length,
        data: new Float32Array(data),
    };
};
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
export const applyLut = (pixels, width, height, lut) => {
    const { data, size } = lut;
    const out = new Uint8ClampedArray(pixels);
    const last = size - 1;
    for (let i = 0; i < pixels.length; i += 4) {
        for (let c = 0; c < 3; c++) {
            const v = pixels[i + c] / 255;
            const pos = v * last;
            const idx = Math.floor(pos);
            const t = pos - idx;
            const a = clamp(idx, 0, last);
            const b = clamp(idx + 1, 0, last);
            out[i + c] = clamp(Math.round(lerp(data[a], data[b], t) * 255), 0, 255);
        }
    }
    return out;
};
// ---------------------------------------------------------------------------
// compose (shader layer API)
// ---------------------------------------------------------------------------
const applyNamedEffect = (pixels, width, height, step) => {
    switch (step.name) {
        case 'filmGrain':
            return applyFilmGrain(pixels, width, height, step.options);
        case 'lensDistortion':
            return applyLensDistortion(pixels, width, height, step.options);
        case 'bloom':
            return applyBloom(pixels, width, height, step.options);
        case 'lut':
            return applyLut(pixels, width, height, step.options.lut);
        case 'blendMode':
            return applyBlendMode(pixels, step.options.top, width, height, {
                mode: step.options.mode,
                opacity: step.options.opacity,
            });
        default:
            return pixels;
    }
};
/**
 * Chains effects into a single deterministic frame function — the shader
 * layer API. Each step is applied in order; the output of one feeds the
 * next. An empty composition returns its input unchanged.
 *
 * @param steps - effect steps to apply, in order
 * @returns `(pixels, width, height) => FramePixels`
 */
export const compose = (...steps) => {
    return (pixels, width, height) => {
        let out = pixels;
        for (const step of steps) {
            out = applyNamedEffect(out, width, height, step);
        }
        return out;
    };
};
//# sourceMappingURL=fx.js.map