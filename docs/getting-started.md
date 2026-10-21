# Getting Started with BrandlyFrames

Install BrandlyFrames and render your first programmatic video.

## Prerequisites

- Node.js ≥ 24
- pnpm 11.5.1+

## Installation

```bash
pnpm add brandlyframes @brandlyframes/player @brandlyframes/renderer
```

## Your first composition

```tsx
import { registerRoot, Composition, Sequence, interpolate } from 'brandlyframes';

registerRoot();

const MyVideo = () => (
  <Composition id="intro" width={1920} height={1080} fps={30} duration={10}>
    <Sequence frames={[0, 300]}>
      <div style={{ opacity: interpolate(frame, [0, 30], [0, 1]) }} />
    </Sequence>
  </Composition>
);
```

## Playback

Use `<Player>` from `@brandlyframes/player` for an embeddable web player with controls and an imperative ref API.

## Headless rendering

Use `@brandlyframes/renderer` for headless Chrome capture and FFmpeg stitching — the backend behind `brandlyframes build`.
