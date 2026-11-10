import { describe, expect, it } from 'vitest';
import {
  createBranchManifest,
  resolveCut,
  planBranchExports,
  rashomonCuts,
  stitchCut,
  type BranchSegment,
  type ChoicePoint,
} from '../src/branch';

// A 3-choice story: spine is 300 frames (0-300).
// Choice at frame 100: branches A (100-200), B (100-150), default spine.
// Rejoin at frame 200 for A, 150 for B.
const spine: BranchSegment[] = [
  { label: 'spine-0', startFrame: 0, endFrame: 300 },
];

const cps: ChoicePoint[] = [
  {
    frame: 100,
    defaultBranch: 'spine',
    branches: [
      { label: 'spine', startFrame: 100, endFrame: 200, source: 'spine.mp4' },
      { label: 'A', startFrame: 100, endFrame: 200, source: 'branch-a.mp4' },
      { label: 'B', startFrame: 100, endFrame: 150, source: 'branch-b.mp4' },
    ],
  },
];

const manifest = createBranchManifest(spine, cps, { 100: 200 });

describe('createBranchManifest', () => {
  it('rejects an empty spine', () => {
    expect(() => createBranchManifest([])).toThrow(/spine/);
  });

  it('rejects a missing default branch', () => {
    expect(() =>
      createBranchManifest(
        spine,
        [{ frame: 100, defaultBranch: 'ghost', branches: [] }],
      ),
    ).toThrow(/ghost/);
  });

  it('accepts a valid manifest', () => {
    expect(manifest.spine).toHaveLength(1);
    expect(manifest.choicePoints).toHaveLength(1);
  });
});

describe('resolveCut', () => {
  it('spine cut (no choices) keeps the default branch', () => {
    const cut = resolveCut(manifest);
    expect(cut.label).toBe('spine');
    expect(cut.totalFrames).toBe(300);
  });

  it('choosing branch A splices it in with correct cut-timeline offsets', () => {
    const cut = resolveCut(manifest, { 100: 'A' });
    expect(cut.label).toBe('A');
    // The cut should be 0-100 spine, then A (100 frames, now at cut offset 100-200),
    // then spine 200-300.
    expect(cut.totalFrames).toBe(300);
    // Chapter markers: start (0), branch:A (100).
    expect(cut.chapters.some((c) => c.label === 'branch:A' && c.frame === 100)).toBe(true);
  });

  it('a shorter branch is padded by spine footage up to the rejoin frame', () => {
    const cut = resolveCut(manifest, { 100: 'B' });
    // The manifest declares rejoin {100: 200}. B runs 100-150 (50 frames)
    // in its own media; spine footage pads 150-200, then continues 200-300.
    // 0-100 spine + B(50) + spine 150-200(50) + spine 200-300(100) = 300.
    expect(cut.totalFrames).toBe(300);
    // B segment itself is 50 frames (100→150 in cut space).
    expect(cut.segments.some((sg) => sg.label === 'B' && sg.endFrame - sg.startFrame === 100)).toBe(true);
  });

  it('throws on an unknown branch label', () => {
    expect(() => resolveCut(manifest, { 100: 'ghost' })).toThrow(/ghost/);
  });

  it('is deterministic: same choices → same cut', () => {
    const a = resolveCut(manifest, { 100: 'A' });
    const b = resolveCut(manifest, { 100: 'A' });
    expect(a.segments).toEqual(b.segments);
    expect(a.chapters).toEqual(b.chapters);
  });
});

describe('planBranchExports', () => {
  it('produces one cut per non-default branch (+ spine)', () => {
    const plan = planBranchExports(manifest);
    // spine + A + B = 3 cuts.
    expect(plan.count).toBe(3);
    const labels = plan.cuts.map((c) => c.label);
    expect(labels).toContain('spine');
    expect(labels).toContain('A');
    expect(labels).toContain('B');
  });

  it('allBranches produces the cartesian product', () => {
    // Two choice points, each with 3 branches → 9 permutations (deduped
    // against the spine default where applicable).
    const spine2: BranchSegment[] = [{ label: 's', startFrame: 0, endFrame: 200 }];
    const cps2: ChoicePoint[] = [
      {
        frame: 50,
        defaultBranch: 'x1',
        branches: [
          { label: 'x1', startFrame: 50, endFrame: 100 },
          { label: 'x2', startFrame: 50, endFrame: 100 },
        ],
      },
      {
        frame: 100,
        defaultBranch: 'y1',
        branches: [
          { label: 'y1', startFrame: 100, endFrame: 150 },
          { label: 'y2', startFrame: 100, endFrame: 150 },
        ],
      },
    ];
    // With rejoin {50:100, 100:150} every combo totals 200 frames, and the
    // 4 combos carry distinct chosen-branch labels: "spine" (x1+y1), "x2",
    // "y2", "x2+y2" → 4 cuts (dedup keys on c.label).
    const m2 = createBranchManifest(spine2, cps2, { 50: 100, 100: 150 });
    const plan = planBranchExports(m2, { allBranches: true });
    expect(plan.count).toBe(4);
    const labels = plan.cuts.map((c) => c.label);
    expect(labels).toContain('spine');
    expect(labels).toContain('x2');
    expect(labels).toContain('y2');
    expect(labels).toContain('x2+y2');
  });
});

describe('rashomonCuts', () => {
  it('returns one cut per interpretation label', () => {
    // Reuse the single choice point; "rashomon" with branches spine/A/B.
    const cuts = rashomonCuts(manifest, 100, ['spine', 'A', 'B']);
    expect(cuts).toHaveLength(3);
    expect(cuts.map((c) => c.label)).toEqual(['spine', 'A', 'B']);
  });

  it('throws when the choice point does not exist', () => {
    expect(() => rashomonCuts(manifest, 999, ['A'])).toThrow(/no choice point/);
  });
});

describe('stitchCut', () => {
  it('flattens a cut into one entry per output frame', () => {
    const cut = resolveCut(manifest, { 100: 'A' });
    const flat = stitchCut(cut);
    expect(flat).toHaveLength(cut.totalFrames);
    // First frame is spine-0 local 0.
    expect(flat[0]?.segment.label).toBe('spine-0');
    expect(flat[0]?.localFrame).toBe(0);
    // Frame 100 is the start of branch A.
    expect(flat[100]?.segment.label).toBe('A');
  });
});
