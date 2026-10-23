# Agent-native BrandlyFrames (BF-100..103)

BrandlyFrames ships first-class tooling for AI agents: an MCP server, a
JSON Schema contract for composition props, and an agent `SKILL.md` that is
copied into every scaffolded project.

## MCP server (`@brandlyframes/mcp`) — BF-100

A stdio (JSON-RPC 2.0) MCP server that reuses the renderer and CLI internals
(`captureFrame`, `runRenderJob`, `stitchFrames`, the Chrome CDP launcher):

```sh
npx @brandlyframes/mcp --entry ./src/compositions.ts
```

`--entry` imports a module before serving so compositions can be registered
imperatively with `registerComposition()` from `brandlyframes`.

| Tool | Purpose |
| ---- | ------- |
| `list_compositions` | registry metadata + props JSON Schema per composition |
| `read_composition_props` | default props + JSON Schema by id |
| `edit_composition_props` | validate props against the Zod schema (brand-kit fallback) |
| `render_still` | single-frame PNG via headless Chrome |
| `render_video` | capture mode (`url`/`outDir`/`start`/`end`) or stitch mode (`inputDir`) → `{ jobId }` |
| `inspect_timeline` | duration, fps, dimensions |
| `read_render_status` | job `status` / `progress` / `outputUrl` / `error` |

Renderer internals are injectable (`McpServerDeps`), which is how the test
suite drives the server in-process with fakes.

## JSON Schema export — BF-101

Composition prop schemas are Zod schemas (BF-008). The MCP server derives a
JSON Schema for each composition with `z.toJSONSchema(...)` (Zod 4) and
returns it from `list_compositions` / `read_composition_props`, so agents can
discover and validate props without reading source code. Compositions without
a schema fall back to the brand-kit contract from `@brandlyframes/zod-types`
(`validateBrandKit`).

## SKILL.md — BF-102

`create-brandlyframes` copies `templates/SKILL.md` into every scaffolded
project: MCP setup, the tool table, CLI equivalents, and a brief-to-MP4
checklist. The same guide lives in `docs/agent-native.md`.

## End-to-end agent test — BF-103

`packages/mcp/test/e2e.test.ts` connects an in-process MCP client
(`InMemoryTransport`) and drives the full brief-to-MP4 flow — discover tools →
discover compositions → read the props JSON Schema → edit props → render →
poll status — and asserts a real, non-empty `ftyp` MP4 lands on disk. The
render uses the ffmpeg-only stitch path (no Chrome needed) and the suite is
skipped when ffmpeg is missing.
