/**
 * BF-506 — auto-generated B-roll & cutaways for @brandlyframes/procedural.
 *
 * A **B-roll plan** maps keywords from a script ("ocean", "city", "forest")
 * to deterministic procedural generators (fractal zooms, terrain sweeps,
 * cellular mosaics, L-system growth) so cutaway footage can be synthesized
 * on the fly instead of pulled from a stock library. Each plan entry
 * declares which generator to use, its seed, and the frame window it
 * occupies between two main segments.
 *
 * Pure + deterministic: same plan + same frame → same generator config.
 * The React components that render the generators (`<FractalZoom>` etc.)
 * already live in this package; this module is the *planning* layer.
 */

import type { FractalConfig, FractalType } from './fractal';
import type { TerrainConfig } from './terrain';
import type { CellularConfig } from './cellular';
import type { LSystemConfig, GrowthPreset } from './growth';
import { defaultFractalConfig } from './fractal';
import { defaultTerrainConfig } from './terrain';
import { gameOfLifeRule } from './cellular';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Which procedural generator a B-roll clip uses. */
export type BrollGenerator =
  | 'fractal'
  | 'terrain'
  | 'cellular'
  | 'lsystem';

/** One B-roll insert: keyword → generator + frame window. */
export interface BrollClip {
  /** The keyword this clip was matched on ("ocean", "city", …). */
  readonly keyword: string;
  /** The generator to render. */
  readonly generator: BrollGenerator;
  /** Seed for the deterministic generator (same seed → same output). */
  readonly seed: number;
  /** Cut-timeline frame at which the insert starts. */
  readonly startFrame: number;
  /** Cut-timeline frame at which the insert ends (exclusive). */
  readonly endFrame: number;
  /** Generator-specific options. Shape depends on `generator`. */
  readonly options?: Readonly<Record<string, unknown>>;
}

/**
 * A B-roll plan: the ordered set of inserts to weave between main segments.
 * Inserts must not overlap in the cut timeline.
 */
export interface BrollPlan {
  readonly clips: readonly BrollClip[];
  /** Total length of the cut timeline this plan covers, in frames. */
  readonly timelineLength: number;
}

/** A keyword → generator + seed mapping table. */
export type KeywordTable = Readonly<
  Record<string, { readonly generator: BrollGenerator; readonly seed?: number }>
>;

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

/**
 * FNV-1a string hash → 32-bit unsigned int. Used to derive a stable seed
 * from a keyword when the table doesn't supply one. Pure.
 */
const fnv1a = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/**
 * Default keyword table: maps common script keywords to a procedural
 * generator + deterministic seed. Extend per project.
 */
export const DEFAULT_KEYWORD_TABLE: KeywordTable = {
  ocean: { generator: 'terrain', seed: 0x0ce1a5 },
  sea: { generator: 'terrain', seed: 0x0ce1a5 },
  waves: { generator: 'terrain', seed: 0x1f5e21 },
  city: { generator: 'cellular', seed: 0xcafe },
  traffic: { generator: 'cellular', seed: 0xb0ba },
  forest: { generator: 'lsystem', seed: 0xf157 },
  tree: { generator: 'lsystem', seed: 0xf157 },
  jungle: { generator: 'lsystem', seed: 0xf157 + 1 },
  mountain: { generator: 'fractal', seed: 0x1021 },
  space: { generator: 'fractal', seed: 0xbeef },
  stars: { generator: 'fractal', seed: 0xbeef },
  galaxy: { generator: 'fractal', seed: 0xbeef + 1 },
  nature: { generator: 'fractal', seed: 0x1212 },
  abstract: { generator: 'fractal', seed: 0x0 },
};

// ---------------------------------------------------------------------------
// Plan construction
// ---------------------------------------------------------------------------

export interface BrollOptions {
  /**
   * Keyword → generator table. Defaults to {@link DEFAULT_KEYWORD_TABLE}.
   */
  readonly keywordTable?: KeywordTable;
  /**
   * Fallback generator for keywords not in the table. Default 'fractal'.
   */
  readonly fallbackGenerator?: BrollGenerator;
  /**
   * Duration of each B-roll insert, in frames. Default 60 (2s @ 30fps).
   */
  readonly clipLength?: number;
  /**
   * Gap (in frames) between consecutive inserts. Default 0.
   */
  readonly gap?: number;
}

/**
 * Build a {@link BrollPlan} from an ordered list of keywords found in a
 * script. Each keyword becomes one insert; unknown keywords fall back to
 * `fallbackGenerator` with a keyword-derived seed.
 *
 * Inserts are placed back-to-back starting at frame 0 (extend with an
 * offset when weaving between main segments). Pure and deterministic.
 *
 * @param keywords - ordered keywords, in script order
 * @param options - keywordTable, fallbackGenerator, clipLength, gap
 * @returns a validated B-roll plan
 */
export const buildBrollPlan = (
  keywords: readonly string[],
  options: BrollOptions = {},
): BrollPlan => {
  const {
    keywordTable = DEFAULT_KEYWORD_TABLE,
    fallbackGenerator = 'fractal',
    clipLength = 60,
    gap = 0,
  } = options;

  const clips: BrollClip[] = [];
  let cursor = 0;
  for (const kw of keywords) {
    const key = kw.trim().toLowerCase();
    const entry = keywordTable[key];
    const generator = entry?.generator ?? fallbackGenerator;
    // Seed: explicit table seed, or FNV-1a of the keyword (stable).
    const seed = entry?.seed ?? fnv1a(key);
    clips.push({
      keyword: key,
      generator,
      seed,
      startFrame: cursor,
      endFrame: cursor + clipLength,
    });
    cursor += clipLength + gap;
  }
  const timelineLength = clips.length === 0 ? 0 : clips[clips.length - 1]?.endFrame ?? 0;
  return { clips, timelineLength };
};

/**
 * Resolve a single B-roll clip into the concrete generator config to pass
 * to the procedural components (`FractalZoom`, `Terrain`, etc.).
 *
 * Deterministic: same clip → same config.
 */
export const resolveBrollClip = (
  clip: BrollClip,
):
  | { readonly kind: 'fractal'; readonly config: FractalConfig }
  | { readonly kind: 'terrain'; readonly config: TerrainConfig }
  | { readonly kind: 'cellular'; readonly config: CellularConfig }
  | { readonly kind: 'lsystem'; readonly config: LSystemConfig; readonly preset?: GrowthPreset } => {
  const opts = (clip.options ?? {}) as Record<string, unknown>;
  switch (clip.generator) {
    case 'fractal':
      return {
        kind: 'fractal',
        config: {
          ...defaultFractalConfig,
          type: (opts.type as FractalType) ?? defaultFractalConfig.type,
          seed: clip.seed,
          width: (opts.width as number) ?? defaultFractalConfig.width,
          height: (opts.height as number) ?? defaultFractalConfig.height,
          maxIterations: (opts.maxIterations as number) ?? defaultFractalConfig.maxIterations,
        },
      };
    case 'terrain':
      return {
        kind: 'terrain',
        config: {
          ...defaultTerrainConfig,
          scale: (opts.scale as number) ?? defaultTerrainConfig.scale,
          octaves: (opts.octaves as number) ?? defaultTerrainConfig.octaves,
        },
      };
    case 'cellular':
      return {
        kind: 'cellular',
        config: {
          width: 24,
          height: 24,
          rule: gameOfLifeRule,
          seed: clip.seed,
        },
      };
    case 'lsystem':
      return {
        kind: 'lsystem',
        config: (opts.config as LSystemConfig | undefined) ??
        ({ axiom: 'X', rules: {}, drawSymbols: [], maxIterations: 5, angleDegrees: 25, step: 10, useStack: true } as LSystemConfig),
        preset: opts.preset as GrowthPreset | undefined,
      };
    default:
      throw new Error(`resolveBrollClip: unknown generator "${String(clip.generator)}"`);
  }
};

// ---------------------------------------------------------------------------
// Weaving between main segments
// ---------------------------------------------------------------------------

export interface MainSegment {
  readonly label: string;
  readonly startFrame: number;
  readonly endFrame: number;
}

export interface WeavedTimeline {
  /** All segments (main + B-roll) in cut order. */
  readonly segments: Array<{ readonly label: string; readonly startFrame: number; readonly endFrame: number; readonly broll?: BrollClip }>;
  /** Total cut-timeline length. */
  readonly totalFrames: number;
}

/**
 * Weave B-roll inserts between main segments: each insert lands in the
 * gap immediately after its `precedingLabel` main segment. The main
 * segments are shifted later to make room. Pure + deterministic.
 *
 * @param mains - the main (non-B-roll) segments, in order
 * @param plan - the B-roll plan
 * @param mapping - which main segment each B-roll clip follows. Defaults to
 *   `clip i follows main segment i` (when counts match).
 */
export const weaveBroll = (
  mains: readonly MainSegment[],
  plan: BrollPlan,
  mapping: Readonly<Record<string, string>> = {},
): WeavedTimeline => {
  // For each B-roll clip, find which main segment it follows.
  const clipAfter = (clip: BrollClip, idx: number): number => {
    const key = mapping[clip.keyword] ?? String(idx);
    return Number(key) || idx;
  };

  const segments: WeavedTimeline['segments'] = [];
  let cursor = 0;
  const mainEnd = mains.map((m) => m.endFrame);
  let mainIdx = 0;
  for (let i = 0; i < plan.clips.length; i++) {
    const clip = plan.clips[i];
    const afterMainIdx = Math.min(clipAfter(clip, i), mains.length - 1);
    // Advance cursor past the main segments up to (and including) afterMainIdx.
    while (mainIdx <= afterMainIdx) {
      if (mainIdx < mains.length) {
        const m = mains[mainIdx];
        segments.push({ label: m.label, startFrame: cursor, endFrame: cursor + (m.endFrame - m.startFrame) });
        cursor += m.endFrame - m.startFrame;
      }
      mainIdx++;
    }
    // Insert the B-roll clip.
    const len = clip.endFrame - clip.startFrame;
    segments.push({ label: `broll:${clip.keyword}`, startFrame: cursor, endFrame: cursor + len, broll: clip });
    cursor += len;
  }
  // Remaining main segments.
  while (mainIdx < mains.length) {
    const m = mains[mainIdx];
    segments.push({ label: m.label, startFrame: cursor, endFrame: cursor + (m.endFrame - m.startFrame) });
    cursor += m.endFrame - m.startFrame;
    mainIdx++;
  }
  void mainEnd;
  return { segments, totalFrames: cursor };
};
