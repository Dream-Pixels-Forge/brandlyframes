---
name: brandlyframes
description: >-
  Render programmatic videos with BrandlyFrames — a React SDK where a video is
  a pure function of the frame number. Use when the user asks for a video,
  animation, promo, intro, lower-third, or motion graphic built from code.
---

# BrandlyFrames — agent skill

BrandlyFrames renders React components frame-by-frame into video. A video is a
pure function of the frame number: `frame → pixels`. Keep renders
deterministic: no wall-clock time, no unseeded randomness, no network fetches
during render.

## Setup (once per project)

1. Scaffold: `npx create-brandlyframes <template> <dir>` (templates: `blank`,
   `hello-world`, `captions`, `product-promo`, `frame-video-demo`).
2. Declare compositions with `<Composition>` in `src/Root.tsx` and give each
   one a Zod `schema` so props can be validated and exported as JSON Schema.

## MCP server (agent tooling)

`@brandlyframes/mcp` exposes the SDK to agents over stdio. Register it in the
MCP client config, e.g.:

```json
{
  "mcpServers": {
    "brandlyframes": {
      "command": "npx",
      "args": ["@brandlyframes/mcp", "--entry", "./src/compositions.ts"]
    }
  }
}
```

`--entry` imports a module before serving so compositions can be registered
imperatively (the registry is read live by the tools):

```ts
// src/compositions.ts
import { registerComposition } from 'brandlyframes';
import { z } from 'zod';
import { Hero } from './Hero';

registerComposition({
  id: 'hero',
  component: Hero,
  durationInFrames: 90,
  fps: 30,
  width: 1280,
  height: 720,
  defaultProps: { headline: 'Hello' },
  schema: z.object({ headline: z.string() }),
});
```

### Tools

| Tool | Input | Result |
| ---- | ----- | ------ |
| `list_compositions` | `{}` | composition metadata + props JSON Schema (derived from Zod) |
| `read_composition_props` | `{ id }` | default props + JSON Schema |
| `edit_composition_props` | `{ id, props }` | validated props (Zod schema, brand-kit fallback) |
| `render_still` | `{ url, frame, out }` | PNG still (needs Chrome) |
| `render_video` | `{ url, outDir, start, end, output }` capture mode, or `{ inputDir, output }` stitch mode | `{ jobId }` — poll `read_render_status` |
| `inspect_timeline` | `{ compositionId }` | duration / fps / dimensions |
| `read_render_status` | `{ jobId }` | `status`, `progress`, `outputUrl`, `error` |

Capture mode needs Chrome and ffmpeg; stitch mode (numbered frame images →
MP4) needs ffmpeg only.

## CLI (no MCP)

```sh
brandlyframes render <url> <outDir> <start> <end>   # capture frames (Chrome)
brandlyframes compositions <framesDir> out.mp4      # frames → MP4 (ffmpeg)
brandlyframes still <url> <frame> out.png           # single PNG still
```

## Brief-to-MP4 checklist

1. `list_compositions` → pick a composition, read its props JSON Schema.
2. `edit_composition_props` → validate the brief's content against the schema.
3. Start the preview server (`pnpm dev`) → `render_video` (capture mode).
4. Poll `read_render_status` until `completed`.
5. Deliver the MP4 from `outputUrl`.
