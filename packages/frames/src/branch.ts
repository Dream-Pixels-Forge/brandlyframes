/**
 * BF-505 — branching narrative rendering.
 *
 * A **branch manifest** describes a set of alternative cuts of the same
 * story: one "spine" segment plus one or more branch segments that
 * diverge from (and may re-converge to) a choice point. Each branch
 * exports as a separate MP4 (multi-branch MP4 export) with a chapter
 * marker at the divergence frame, and a **Rashomon mode** helper produces
 * one export per interpretation of the same scene.
 *
 * This module ships the *data model + stitcher* — the pure, deterministic
 * half. The React `<Choice>` component and the MP4 encoder live in
 * `@brandlyframes/core` / the export pipeline; they consume the manifest
 * this module produces.
 *
 * All functions are pure: same manifest + choice → same stitched timeline.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One linear segment of frames in a single cut. */
export interface BranchSegment {
  /** Human-readable label ("main", "A", "B", "Rashomon-2"). */
  readonly label: string;
  /** Frame at which this segment starts *within its own cut* (0-based). */
  readonly startFrame: number;
  /** Frame at which this segment ends, exclusive (0-based). */
  readonly endFrame: number;
  /**
   * Optional source-clip hint: the media asset this segment renders from.
   * Omitted = procedural / placeholder.
   */
  readonly source?: string;
}

/**
 * A choice point: the frame at which the narrative diverges and the set of
 * alternative branches available.
 *
 * @param point.frame - the divergence frame (on the spine cut)
 * @param point.defaultBranch - which branch plays when no choice is made
 * @param point.branches - the available alternative segments
 */
export interface ChoicePoint {
  readonly frame: number;
  readonly defaultBranch: string;
  readonly branches: readonly BranchSegment[];
}

/**
 * A full branch manifest: the spine (main) timeline plus every choice
 * point and its branches.
 *
 * `spine` is the linear cut; `choicePoints` mark the divergences. Each
 * branch in a choice point is a `BranchSegment` that, when selected,
 * *replaces* the spine frames in `[choicePoint.frame, rejoinFrame)` with
 * the branch's own frames, then rejoins the spine at `rejoinFrame`
 * (or runs to the end of the branch when `rejoinFrame` is absent).
 */
export interface BranchManifest {
  /** The main (spine) segments, in order. */
  readonly spine: readonly BranchSegment[];
  /** Choice points along the spine. */
  readonly choicePoints: readonly ChoicePoint[];
  /**
   * For a given choice point label, the spine frame at which the branch
   * rejoins the spine (exclusive). Absent = the branch runs to the end.
   */
  readonly rejoinFrames?: Readonly<Record<number, number>>;
}

/** A concrete resolved cut: one branch chosen at every choice point. */
export interface ResolvedCut {
  /** Human-readable name of this cut ("spine", "A+B", "rashomon-2"). */
  readonly label: string;
  /** The ordered list of segments that make up this cut. */
  readonly segments: readonly BranchSegment[];
  /** Total length of the cut, in frames. */
  readonly totalFrames: number;
  /**
   * Chapter markers: frame → label, suitable for an MP4 chapter track.
   * Always includes frame 0 ("start") and every divergence/rejoin.
   */
  readonly chapters: ReadonlyArray<{ readonly frame: number; readonly label: string }>;
}

// ---------------------------------------------------------------------------
// Manifest construction
// ---------------------------------------------------------------------------

/**
 * Build a {@link BranchManifest} from a spine and choice points. Validates
 * that every `defaultBranch` exists in the corresponding choice point and
 * that spine frames are monotonically increasing.
 *
 * @throws if the spine is empty or a default branch is missing.
 */
export const createBranchManifest = (
  spine: readonly BranchSegment[],
  choicePoints: readonly ChoicePoint[] = [],
  rejoinFrames: Readonly<Record<number, number>> = {},
): BranchManifest => {
  if (spine.length === 0) throw new Error('createBranchManifest: spine must be non-empty');
  // Validate monotonic spine.
  for (let i = 1; i < spine.length; i++) {
    if (spine[i]?.startFrame !== spine[i - 1]?.endFrame) {
      throw new Error(
        `createBranchManifest: spine segments must be contiguous ` +
          `(segment ${i - 1} ends at ${spine[i - 1]?.endFrame}, segment ${i} starts at ${spine[i]?.startFrame})`,
      );
    }
  }
  for (const cp of choicePoints) {
    if (!cp.branches.some((b) => b.label === cp.defaultBranch)) {
      throw new Error(
        `createBranchManifest: default branch "${cp.defaultBranch}" not found at choice point frame ${cp.frame}`,
      );
    }
  }
  return { spine, choicePoints, rejoinFrames };
};

// ---------------------------------------------------------------------------
// Resolving a cut
// ---------------------------------------------------------------------------

/**
 * Resolve a concrete cut by choosing one branch at every choice point.
 *
 * @param manifest - the branch manifest
 * @param choices - map of choice-point frame → chosen branch label. Omitted
 *   points default to `choicePoint.defaultBranch`.
 * @returns a fully ordered {@link ResolvedCut} with chapters
 */
export const resolveCut = (
  manifest: BranchManifest,
  choices: Readonly<Record<number, string>> = {},
): ResolvedCut => {
  // Validate the manifest shape first, then delegate to the normalizer.
  validateManifest(manifest, choices);
  const normalized = normalizeSegments(manifest, choices);
  const label = cutLabel(manifest, choices);
  return {
    label,
    segments: normalized.segments,
    totalFrames: normalized.totalFrames,
    chapters: normalized.chapters,
  };
};

/** Short human-readable label for a resolved cut: "spine" or "A+B". */
const cutLabel = (
  manifest: BranchManifest,
  choices: Readonly<Record<number, string>>,
): string => {
  const nonDefault: string[] = [];
  for (const cp of manifest.choicePoints) {
    const chosen = choices[cp.frame] ?? cp.defaultBranch;
    if (chosen !== cp.defaultBranch) nonDefault.push(chosen);
  }
  return nonDefault.length === 0 ? 'spine' : nonDefault.join('+');
};

/** Validate that every referenced branch label exists in the manifest. */
const validateManifest = (
  manifest: BranchManifest,
  choices: Readonly<Record<number, string>>,
): void => {
  for (const cp of manifest.choicePoints) {
    if (!cp.branches.some((b) => b.label === cp.defaultBranch)) {
      throw new Error(
        `branch: default branch "${cp.defaultBranch}" not found at choice point frame ${cp.frame}`,
      );
    }
    const chosen = choices[cp.frame];
    if (chosen !== undefined && !cp.branches.some((b) => b.label === chosen)) {
      throw new Error(`branch: unknown branch "${chosen}" at choice point frame ${cp.frame}`);
    }
  }
};

/**
 * Normalize a resolved cut into a clean, contiguous segment list with
 * accurate cut-timeline offsets and chapter markers. This is the actual
 * stitching logic — `resolveCut` delegates here.
 */
const totalSpineEnd = (spine: readonly BranchSegment[]): number =>
  spine.length === 0 ? 0 : spine[spine.length - 1]?.endFrame ?? 0;

const normalizeSegments = (
  manifest: BranchManifest,
  choices: Readonly<Record<number, string>>,
): { segments: BranchSegment[]; totalFrames: number; chapters: Array<{ frame: number; label: string }> } => {
  const { spine, choicePoints } = manifest;
  const rejoinFrames: Readonly<Record<number, number>> = manifest.rejoinFrames ?? {};
  const cps = [...choicePoints].sort((a, b) => a.frame - b.frame);

  const segments: BranchSegment[] = [];
  const chapters: Array<{ frame: number; label: string }> = [{ frame: 0, label: 'start' }];

  let spineCursor = 0; // next spine frame to emit
  let cutCursor = 0; // next cut-timeline offset

  // Emit the spine in chunks, splicing in the chosen branch at each choice
  // point. A choice point at spine frame F splits the spine: emit
  // [cursor, F), emit the branch, then resume the spine at the rejoin frame.
  const spineEnd = totalSpineEnd(spine);
  let segIdx = 0;
  let nextCpIdx = 0; // index into cps (sorted); advances past spliced points
  while (spineCursor < spineEnd) {
    const nextCp = nextCpIdx < cps.length ? cps[nextCpIdx] : undefined;
    // The spine chunk runs to the next choice point (if one is still ahead)
    // or to the end of the spine.
    const chunkEnd = nextCp ? Math.min(nextCp.frame, spineEnd) : spineEnd;
    if (chunkEnd > spineCursor) {
      const seg = spine[segIdx] ?? { label: 'spine', startFrame: spineCursor, endFrame: chunkEnd };
      segments.push({
        ...seg,
        startFrame: cutCursor,
        endFrame: cutCursor + (chunkEnd - spineCursor),
      });
      cutCursor += chunkEnd - spineCursor;
      spineCursor = chunkEnd;
      while (segIdx < spine.length && spine[segIdx]?.endFrame <= spineCursor) segIdx++;
    }
    if (!nextCp) break; // spine consumed, no choice points left
    // Splice the chosen branch at nextCp.frame (spineCursor === nextCp.frame here).
    const cp = nextCp;
    nextCpIdx++;
    const chosenLabel = choices[cp.frame] ?? cp.defaultBranch;
    const branch = cp.branches.find((b) => b.label === chosenLabel);
    if (!branch) {
      throw new Error(`normalizeSegments: unknown branch "${chosenLabel}" at frame ${cp.frame}`);
    }
    // The branch occupies the full spine window [cp.frame, rejoin) in the
    // cut timeline: its own media runs for (branch.endFrame -
    // branch.startFrame) frames, and any remainder up to `rejoin` is filled
    // by spine footage (the loop resumes at spineCursor = rejoin).
    const rejoin = Math.max(rejoinFrames[cp.frame] ?? 0, branch.endFrame);
    const branchCutLen = rejoin - cp.frame;
    segments.push({
      ...branch,
      startFrame: cutCursor,
      endFrame: cutCursor + branchCutLen,
    });
    chapters.push({ frame: cutCursor, label: `branch:${branch.label}` });
    cutCursor += branchCutLen;
    // After the branch, resume the spine at the rejoin frame. Skip spine
    // segments fully behind the new cursor.
    spineCursor = rejoin;
    while (segIdx < spine.length && spine[segIdx]?.endFrame <= spineCursor) segIdx++;
  }

  return { segments, totalFrames: cutCursor, chapters };
};

// ---------------------------------------------------------------------------
// Multi-branch export planning
// ---------------------------------------------------------------------------

export interface BranchExportPlan {
  /** One entry per branch that should be exported as its own MP4. */
  readonly cuts: readonly ResolvedCut[];
  /** Total number of MP4 files to produce. */
  readonly count: number;
}

/**
 * Plan the multi-branch MP4 export: one `ResolvedCut` per choice point
 * (the spine cut + every non-default branch), ready to hand to the
 * encoder. Each cut carries its own chapter markers.
 *
 * @param manifest - the branch manifest
 * @param options.allBranches - when true, also emit every *permutation*
 *   of choices (cartesian product across choice points); otherwise one
 *   cut per choice point (default branch + each alternative).
 */
export const planBranchExports = (
  manifest: BranchManifest,
  options: { readonly allBranches?: boolean } = {},
): BranchExportPlan => {
  const { allBranches = false } = options;
  if (!allBranches) {
    const cps = manifest.choicePoints;
    const cuts: ResolvedCut[] = [resolveCut(manifest)];
    for (const cp of cps) {
      for (const branch of cp.branches) {
        if (branch.label === cp.defaultBranch) continue;
        cuts.push(resolveCut(manifest, { [cp.frame]: branch.label }));
      }
    }
    return { cuts, count: cuts.length };
  }
  // Cartesian product across choice points: every branch at every point.
  const cps = manifest.choicePoints;
  const labelSets: string[][] = cps.map((cp) => cp.branches.map((b) => b.label));
  // Seed: one combo per label of the first choice point (empty when there
  // are no choice points). Then fold in each subsequent label set.
  const combos: string[][] =
    labelSets.length > 0
      ? labelSets[0]?.map((l) => [l]) ?? [[]]
      : [[]];
  const product: string[][] = (() => {
    let acc: string[][] = combos;
    for (let i = 1; i < labelSets.length; i++) {
      const opts = labelSets[i] ?? [];
      const next: string[][] = [];
      for (const prev of acc) {
        for (const l of opts) {
          next.push([...prev, l]);
        }
      }
      acc = next;
    }
    return acc;
  })();
  void combos;
  const cuts: ResolvedCut[] = [];
  for (const combo of product) {
    const choices: Record<number, string> = {};
    cps.forEach((cp, i) => {
      const label = combo[i] ?? cp.defaultBranch;
      // Guard against a malformed combo (out-of-range index after a
      // shorter set) — fall back to the default branch.
      if (cp.branches.some((b) => b.label === label)) {
        choices[cp.frame] = label;
      } else {
        choices[cp.frame] = cp.defaultBranch;
      }
    });
    cuts.push(resolveCut(manifest, choices));
  }
  // Each combo is a distinct branch choice; keep them all. (Deduplicating
  // on c.label would collapse combos that differ only in branch media but
  // share a cut label — wrong: they are different MP4 files.)
  return { cuts, count: cuts.length };
};

// ---------------------------------------------------------------------------
// Rashomon mode — same scene, N interpretations
// ---------------------------------------------------------------------------

/**
 * Rashomon mode: the same scene (same spine segment) rendered N times
 * with N different "interpretation" branches (e.g. three witness
 * accounts). Returns one `ResolvedCut` per interpretation.
 *
 * @param manifest - a manifest whose choice point at `cpFrame` has one
 *   branch per interpretation
 * @param cpFrame - the choice point to expand
 * @param interpretationLabels - the branch labels, in order
 */
export const rashomonCuts = (
  manifest: BranchManifest,
  cpFrame: number,
  interpretationLabels: readonly string[],
): ResolvedCut[] => {
  const cp = manifest.choicePoints.find((c) => c.frame === cpFrame);
  if (!cp) throw new Error(`rashomonCuts: no choice point at frame ${cpFrame}`);
  return interpretationLabels.map((label) => resolveCut(manifest, { [cpFrame]: label }));
};

// ---------------------------------------------------------------------------
// Stitching helper — concatenate segments into a flat frame index list
// ---------------------------------------------------------------------------

/**
 * Flatten a `ResolvedCut` into a list of `{ sourceSegment, frame }` entries
 * — one per output frame. This is what the MP4 encoder consumes: for each
 * output frame, which source segment to pull from and which local frame.
 *
 * Pure and deterministic.
 *
 * @param cut - the resolved cut
 * @returns one entry per output frame, in order
 */
export const stitchCut = (
  cut: ResolvedCut,
): Array<{ readonly segment: BranchSegment; readonly localFrame: number }> => {
  const out: Array<{ segment: BranchSegment; localFrame: number }> = [];
  for (const seg of cut.segments) {
    const len = seg.endFrame - seg.startFrame;
    for (let f = 0; f < len; f++) {
      out.push({ segment: seg, localFrame: seg.startFrame + f });
    }
  }
  return out;
};
