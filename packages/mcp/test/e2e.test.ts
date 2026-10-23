/**
 * BF-103: brief-to-MP4 end-to-end agent flow.
 *
 * A scripted agent drives the MCP server in-process (InMemoryTransport):
 * discover tools → discover compositions → read the Zod-derived props JSON
 * Schema → edit props → render → poll status → real MP4 on disk. The render
 * uses the ffmpeg-only stitch path (numbered frames → h264 MP4), so no Chrome
 * is required; the suite is skipped when ffmpeg is missing.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import { clearCompositions, registerComposition } from 'brandlyframes';
import { BrandlyFramesMCPServer } from '../src/index.js';

const hasFfmpeg = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
})();

/** Builds a minimal valid RGBA PNG of `size`×`size` solid pixels (node:zlib only). */
function tinyPng(size = 4, rgba: readonly [number, number, number, number] = [99, 102, 241, 255]) {
  const chunk = (type: string, data: Buffer): Buffer => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 4);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const o = row + 1 + x * 4;
      raw[o] = rgba[0];
      raw[o + 1] = rgba[1];
      raw[o + 2] = rgba[2];
      raw[o + 3] = rgba[3];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Parses the single JSON text payload of a tool result (JSON.parse → any). */
const payload = (result: unknown) =>
  JSON.parse((result as { content: Array<{ text: string }> }).content[0]!.text);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  clearCompositions();
});

describe.skipIf(!hasFfmpeg)('BF-103 brief-to-MP4 agent flow (in-process MCP client)', () => {
  it('drives brief → props → render → status over MCP and produces a real MP4', async () => {
    // The "project": a composition with a Zod props schema (the brief contract).
    registerComposition({
      id: 'agent-hero',
      component: () => null,
      durationInFrames: 30,
      fps: 30,
      width: 64,
      height: 64,
      defaultProps: { headline: 'Launch video' },
      schema: z.object({ headline: z.string().min(1) }),
    });

    const server = new BrandlyFramesMCPServer(); // real renderer internals (ffmpeg stitch path)
    const client = new Client({ name: 'agent-e2e', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    // 1. Agent discovers the tool surface.
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        'list_compositions',
        'read_composition_props',
        'edit_composition_props',
        'render_video',
        'read_render_status',
      ]),
    );

    // 2. Agent discovers compositions and the props JSON Schema.
    const listed = payload(await client.callTool({ name: 'list_compositions', arguments: {} }));
    const hero = listed.compositions.find((c: { id: string }) => c.id === 'agent-hero');
    expect(hero).toBeTruthy();
    expect(hero.propsSchema.properties.headline.type).toBe('string');

    // 3. Agent reads + edits props against the schema.
    const edited = payload(
      await client.callTool({
        name: 'edit_composition_props',
        arguments: { id: 'agent-hero', props: { headline: 'From the brief' } },
      }),
    );
    expect(edited.ok).toBe(true);
    expect(edited.props.headline).toBe('From the brief');

    // 4. Agent renders: ffmpeg-only stitch path (CI-safe, no Chrome).
    const dir = mkdtempSync(join(tmpdir(), 'bf-mcp-e2e-'));
    try {
      for (let i = 0; i < 3; i++) {
        writeFileSync(join(dir, `frame-${String(i).padStart(6, '0')}.png`), tinyPng(4));
      }
      const mp4 = join(dir, 'brief.mp4');
      const start = payload(
        await client.callTool({
          name: 'render_video',
          arguments: { inputDir: dir, output: mp4, fps: 30, codec: 'h264' },
        }),
      );
      expect(start.jobId).toBeTruthy();

      // 5. Agent polls status until the job completes.
      let status;  // evolving any from JSON payloads
      for (let i = 0; i < 200; i++) {
        status = payload(
          await client.callTool({
            name: 'read_render_status',
            arguments: { jobId: start.jobId },
          }),
        );
        if (status.status === 'completed' || status.status === 'failed') break;
        await sleep(50);
      }
      expect(status.status).toBe('completed');
      expect(status.progress).toBe(1);
      expect(status.outputUrl).toBe(mp4);

      // 6. The artifact is a real, non-empty MP4.
      expect(existsSync(mp4)).toBe(true);
      expect(statSync(mp4).size).toBeGreaterThan(0);
      const head = readFileSync(mp4).subarray(0, 12);
      expect(head.toString('latin1').slice(4, 8)).toBe('ftyp');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});
