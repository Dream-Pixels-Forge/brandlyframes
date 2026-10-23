---
'@brandlyframes/mcp': minor
---

feat: real MCP tool implementations over renderer/CLI internals, JSON Schema export, stdio bin, e2e agent test [BF-100, BF-101, BF-103]

- Wire all 7 tools to real implementations: `list_compositions` / `read_composition_props` read the core composition registry; `edit_composition_props` validates against the composition's Zod schema (`validateCompositionProps`) with a brand-kit fallback (`validateBrandKit`); `render_still` uses `captureFrame` + the CLI CDP launcher; `render_video` runs `runRenderJob` + `stitchFrames` (capture mode) or `stitchFrames` only (ffmpeg stitch mode); `read_render_status` tracks live job progress
- `propsJsonSchema()` derives JSON Schema from Zod prop schemas via `z.toJSONSchema` (Zod 4, matching core); tool inputs are JSON-Schema-typed from Zod
- `brandlyframes-mcp` stdio bin (`--entry <module>` imports a registration module before serving); `connect()` for in-process transports
- Injectable `McpServerDeps` (captureStill / renderJob / stitch / launcher) mirroring the renderer's injectable patterns
- In-process MCP client contract tests (15) + brief-to-MP4 e2e test that renders a real h264 MP4 via ffmpeg and skips when ffmpeg is missing [BF-103]
- Align on zod ^4.6.7 (core's zod major); drop unused react peerDep
