---
"@brandlyframes/frames": minor
---

Add branching narrative rendering (BF-505, part of #91): `createBranchManifest` (spine + choice points + rejoin frames, validated), `resolveCut` (splice one chosen branch per choice point into a contiguous cut-timeline with chapter markers), `planBranchExports` (per-branch and full cartesian-product multi-branch export plans), `rashomonCuts` (same scene, N interpretations), `stitchCut` (flatten a cut into per-frame source lookups for the MP4 encoder). Pure deterministic math — the React `<Choice>` component and MP4 encoder consume this manifest in `@brandlyframes/core`.
