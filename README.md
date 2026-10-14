# BrandlyFrames

> **Mission:** programmatic video creation for React — a video is a pure function of the frame number (`frame -> pixels`). Write components, preview them live, render to MP4/WebM/GIF/PNG.

**Status:** P0 Foundation (BF-001) — monorepo scaffold, tooling, CI. The public core API lands with P1. Source of truth: [`dev-notes/Goals/GOAL_00.md`](dev-notes/Goals/GOAL_00.md).

## Monorepo layout

```
brandlyframes/
├─ packages/            # one package per job (pnpm workspace + Turborepo)
│  └─ core/             # published as "brandlyframes" — hooks, components, timing (P1)
├─ .github/workflows/   # CI (type-check, lint, build, test on every PR)
├─ dev-notes/           # goals, spec, security baseline, run logs (not shipped)
├─ turbo.json           # task graph (build / test / lint / type-check)
└─ tsconfig.base.json   # shared strict TypeScript baseline
```

Planned packages (see GOAL_00 §5): `@brandlyframes/cli`, `bundler`, `renderer`, `studio`, `player`, `cloud`, `frames` (first-class frame-by-frame video), and more.

## Toolchain

- Node.js ≥ 24, pnpm 11.5.1 (never npm/yarn/bun), TypeScript strict
- Turborepo task graph, ESLint 9 flat config + Prettier, Vitest
- Changesets with a **fixed (lockstep) version group** — all packages release together
- `pnpm build` / `pnpm test` / `pnpm lint` / `pnpm type-check` from the root

## Clean-room note

BrandlyFrames replicates the _architecture and concepts_ of Remotion — never its source code, docs text, or assets (Remotion uses a custom license). All code is written from scratch under the MIT license; public API names are BrandlyFrames' own. Permissive license, no render fees, free for commercial use.
