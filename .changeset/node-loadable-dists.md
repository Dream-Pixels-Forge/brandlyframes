---
'brandlyframes': minor
'@brandlyframes/zod-types': minor
'@brandlyframes/cli': minor
---

fix: Node-loadable ESM dists for core, zod-types and CLI declarations

- `brandlyframes` / `@brandlyframes/zod-types`: dist bundles via esbuild (tsc still emits declarations) — the previous extensionless ESM output could only be consumed by bundlers, which blocked the stdio MCP server and any plain-Node consumer
- `@brandlyframes/cli`: add `./cdp-launcher` exports subpath and emit declaration files so `createCdpLauncher` can be reused by `@brandlyframes/mcp`
