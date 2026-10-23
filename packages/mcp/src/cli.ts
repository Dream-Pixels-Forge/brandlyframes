#!/usr/bin/env node
/**
 * brandlyframes-mcp — stdio entry point for the agent MCP server [BF-100].
 *
 * Usage: brandlyframes-mcp [--entry <module>]
 *
 * `--entry` imports a module (relative to cwd) before serving, so projects
 * can register compositions imperatively via `registerComposition()` from
 * `brandlyframes`. See SKILL.md / docs/agent-native.md.
 */

import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BrandlyFramesMCPServer } from './mcp-server.js';

const { values } = parseArgs({
  options: { entry: { type: 'string' } },
});

if (values.entry) {
  await import(pathToFileURL(resolve(values.entry)).href);
}

const server = new BrandlyFramesMCPServer();
await server.run();
