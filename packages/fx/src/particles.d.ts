/**
 * BF-504 — volumetric light & particle systems for @brandlyframes/fx.
 *
 * All functions are pure and deterministic: `(frame, seed, options) -> pixels`
 * (or particle positions). No `Math.random`, no wall clock, no GPU. The
 * same input always yields byte-identical output, so preview and render match.
 *
 * Exports:
 * - `ParticleSystem` — seeded particle field (snow / dust / embers)
 * - `Particle` — a single particle's state at a given frame
 * - `simulateParticles` — advance a particle system by one frame
 * - `applyGodRays` — volumetric light-ray bloom from bright pixels
 * - `applyVolumetricDust` — floating dust motes over a frame
 * - `makeParticleSteps` — compose()-ready EffectStep[] wrapper
 */
import type { EffectStep, FramePixels } from './fx';
/**
 * 2D value-noise in [0,1]. At integer coordinates (the common case for
 * per-pixel sampling with grainSize=1) this returns a pure hash — fully
 * deterministic and frame-sensitive when the seed advances with frame.
 */
declare const valueNoise2D: (x: number, y: number, seed: number) => number;
/** A single particle's position/velocity in normalized [0,1] frame space. */
export interface Particle {
    /** X in 0..1. */
    readonly x: number;
    /** Y in 0..1. */
    readonly y: number;
    /** Size in pixels. */
    readonly size: number;
    /** Opacity 0..1. */
    readonly opacity: number;
    /** Stable particle identity (for keying across frames). */
    readonly id: number;
}
export type ParticleKind = 'snow' | 'dust' | 'embers';
export interface ParticleSystemOptions {
    /** Particle count. Default 500. */
    readonly count?: number;
    /** Particle kind: preset motion/color profile. Default 'dust'. */
    readonly kind?: ParticleKind;
    /** Seed (deterministic particle layout). Default 0. */
    readonly seed?: number;
    /** Per-frame vertical velocity (in normalized units). Snow/embers fall. */
    readonly fallSpeed?: number;
    /** Horizontal drift amplitude (normalized). Default 0.01. */
    readonly drift?: number;
    /** Min/max particle size in pixels. */
    readonly minSize?: number;
    readonly maxSize?: number;
}
/**
 * A deterministic seeded particle system. Each particle's state is a pure
 * function of `(id, seed, frame)` — no per-frame mutation or physics
 * integration, so the same frame number always reproduces the same field.
 *
 * The "motion" is a sum of:
 * - a constant vertical fall (snow/embers fall, dust bobs),
 * - a sinusoidal horizontal drift (per-particle phase),
 * - a noise-walk wobble.
 *
 * Particles wrap vertically (falling ones reappear at the top), so the
 * field is stable for arbitrary `frame`.
 */
export declare class ParticleSystem {
    private readonly count;
    private readonly seed;
    private readonly fallSpeed;
    private readonly drift;
    private readonly minSize;
    private readonly maxSize;
    private readonly kind;
    constructor(options?: ParticleSystemOptions);
    /** The particle count. */
    get length(): number;
    /**
     * Sample a single particle's state at composition frame `frame`.
     *
     * @param index - particle index in [0, count)
     * @param frame - the composition's current frame (0-based)
     * @returns the particle's position/size/opacity
     */
    at(index: number, frame: number): Particle;
    /**
     * Sample all particles at `frame` (useful for full-field renderers).
     */
    all(frame: number): Particle[];
}
/**
 * Convenience factory: build a {@link ParticleSystem} with sensible presets
 * for the named particle kinds.
 */
export declare const createParticleSystem: (kind?: ParticleKind, count?: number, seed?: number) => ParticleSystem;
/**
 * Render a particle system into an RGBA frame (alpha-blended, additive
 * for embers, normal for snow/dust).
 *
 * @param system - the particle system
 * @param frame - the composition's current frame
 * @param width - target frame width in px
 * @param height - target frame height in px
 * @param color - particle RGB color. Default white.
 * @returns new RGBA pixel data (transparent background)
 */
export declare const renderParticles: (system: ParticleSystem, frame: number, width: number, height: number, color?: readonly [number, number, number]) => FramePixels;
export interface GodRaysOptions {
    /** Luma threshold 0..1 above which a source pixel emits rays. Default 0.85. */
    readonly threshold?: number;
    /** Ray falloff across the frame (0..1; higher = longer). Default 0.5. */
    readonly falloff?: number;
    /** Ray intensity, 0 (none) to 1 (strong). Default 0.3. */
    readonly intensity?: number;
    /** Sample step in pixels (larger = cheaper). Default 4. */
    readonly step?: number;
}
/**
 * Simulates volumetric light rays ("god rays") emanating from bright pixels:
 * a deterministic radial blur centered on each bright source, attenuated
 * by distance. Pure pixel math — no GPU.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param options - threshold, falloff, intensity, step
 * @returns new RGBA pixel data (input is not mutated)
 */
export declare const applyGodRays: (pixels: FramePixels, width: number, height: number, options?: GodRaysOptions) => FramePixels;
/**
 * Renders a seeded dust-mote overlay onto a frame (subtle floating specks).
 * Pure function of `(pixels, frame, seed, count)`.
 *
 * @param pixels - RGBA pixel data
 * @param width - frame width
 * @param height - frame height
 * @param frame - the composition's current frame
 * @param seed - deterministic seed
 * @param count - dust particle count. Default 300.
 * @param opacity - max speck opacity 0..1. Default 0.15.
 * @returns new RGBA pixel data (input is not mutated)
 */
export declare const applyVolumetricDust: (pixels: FramePixels, width: number, height: number, frame: number, seed: number, count?: number, opacity?: number) => FramePixels;
/**
 * Build {@link EffectStep}[] for {@link compose} that approximates a particle
 * look. (Note: `compose` steps only take the current frame; a full
 * per-frame particle simulation requires calling `renderParticles` directly
 * in a custom shader layer.)
 */
export declare const makeParticleSteps: () => EffectStep[];
export { valueNoise2D as particleNoise };
//# sourceMappingURL=particles.d.ts.map