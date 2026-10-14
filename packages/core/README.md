# brandlyframes (core)

The core package of **BrandlyFrames** — a programmatic video SDK for React.
A video is a pure function of the frame number: **frame → pixels**. Your
components read the current frame and render deterministically, so rendering
frame N always produces the same output.

This package currently ships the v0.1 "Slate" P1 engine: timeline timing,
frame-scoping components, animation utilities, the composition registry, and
frame-driven media primitives.

## Install

```bash
pnpm add brandlyframes
```

Requires React 19 as a peer dependency.

## Quick start

```tsx
// entry.tsx — the file your bundler/renderer points at
import { registerRoot } from 'brandlyframes';
import { Root } from './Root';

registerRoot(<Root />);
```

```tsx
// Root.tsx — declare one <Composition> per renderable video
import { Composition } from 'brandlyframes';
import { MyVideo } from './MyVideo';

export const Root = () => (
  <Composition
    id="my-video"
    component={MyVideo}
    durationInFrames={150}
    fps={30}
    width={1080}
    height={1920}
  />
);
```

```tsx
// MyVideo.tsx — a video is a function of the frame
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'brandlyframes';

export const MyVideo = () => {
  const frame = useCurrentFrame();

  // Animate opacity from 0 → 1 over the first 30 frames (clamped afterwards).
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#FF6A00', opacity }}>
      {/* Sequence scopes time: children see frames 0..59 of the subtitle */}
      <Sequence from={30} durationInFrames={60}>
        <Subtitle />
      </Sequence>
    </AbsoluteFill>
  );
};

const Subtitle = () => {
  const frame = useCurrentFrame(); // relative to the enclosing Sequence
  return <h1>{frame < 30 ? 'Hello' : 'World'}</h1>;
};
```

## Public API map

| Area                  | Exports                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| Entry / registry      | `registerRoot`, `getRootComponent`, `Composition`, `getCompositions`, `resolveCompositionMetadata`, … |
| Frame context & hooks | `FrameContextProvider`, `useCurrentFrame`, `useVideoConfig`                                           |
| Timeline components   | `Sequence`, `Series`, `Loop`, `Freeze`, `AbsoluteFill`                                                |
| Animation             | `interpolate`, `Easing`, `spring`, `interpolateColors`                                                |
| Timing math (pure)    | `resolveSequenceFrame`, `computeSeriesStarts`, `resolveLoopFrame`, `resolveFreezeFrame`, …            |
| Runtime               | `holdFrame`, `releaseFrame`, `Img`, `Audio`, `Video`, `useMarker`                                     |
| Utilities             | `random` (seeded), `staticFile`, `getInputProps`, `sec`, `ms`, `tc`                                   |

Everything exported from `src/index.ts` is fully TSDoc-documented and typed
strictly — no `any` in the public API. See `src/index.ts` for the complete,
grouped export list.

## Development

```bash
pnpm test            # vitest run
pnpm test:coverage   # vitest with coverage; >= 90% lines enforced for src/timing/** and src/animation/**
pnpm type-check      # tsc --noEmit
pnpm build           # tsc --noEmit (types-only package for now)
```

BrandlyFrames is built clean-room: no Remotion code, docs, or assets.
