---
'@brandlyframes/mcp': minor
---

feat: complete MCP server with all 7 tools + JSON Schema [BF-100]

Add to `@brandlyframes/mcp`:
- `inspect_timeline` tool — inspect timeline structure (sequences, series, loops, frame ranges)
- `read_render_status` tool — check render job status (id, status, progress, output URL, error)
- `registerRenderJob()` — register render job progress from the renderer/CLI
- `compositionJsonSchema` — machine-readable JSON Schema derived from Zod for agent prop validation
- All 7 MCP tools: list_compositions, read_composition_props, edit_composition_props, render_still, render_video, inspect_timeline, read_render_status
- Unit tests covering schema and server
