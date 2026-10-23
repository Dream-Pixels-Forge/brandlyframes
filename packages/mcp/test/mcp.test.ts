/**
 * BF-100: MCP server tool contract tests (in-process MCP client).
 *
 * Drives the real server over an in-memory MCP transport: tool registration,
 * composition discovery, Zod-derived JSON Schema [BF-101], prop validation
 * (composition schema, brand-kit fallback), render still/video with injected
 * renderer internals, and render job status tracking.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import { clearCompositions, registerComposition } from 'brandlyframes';
import {
  BrandlyFramesMCPServer,
  type McpServerDeps,
  type RenderJobStatus,
} from '../src/index.js';

const noopComponent = () => null;

/** Connects a fresh in-process MCP client to a fresh server instance. */
async function makeClient(deps: McpServerDeps = {}) {
  const server = new BrandlyFramesMCPServer(deps);
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { server, client };
}

/** Parses the single JSON text payload of a tool result (JSON.parse → any). */
const payload = (result: unknown) =>
  JSON.parse((result as { content: Array<{ text: string }> }).content[0]!.text);

/** Raw text of a tool result (error messages are plain text, not JSON). */
const rawText = (result: unknown): string =>
  (result as { content: Array<{ text: string }> }).content[0]!.text;

function tmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'bf-mcp-test-'));
}

beforeEach(() => {
  clearCompositions();
});

describe('MCP tool contract [BF-100]', () => {
  it('registers exactly the 7 agent tools with object input schemas', async () => {
    const { client } = await makeClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual([
      'list_compositions',
      'read_composition_props',
      'edit_composition_props',
      'render_still',
      'render_video',
      'inspect_timeline',
      'read_render_status',
    ]);
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('list_compositions returns registry metadata + Zod-derived JSON Schema [BF-101]', async () => {
    registerComposition({
      id: 'hero',
      component: noopComponent,
      durationInFrames: 90,
      fps: 30,
      width: 1280,
      height: 720,
      defaultProps: { headline: 'Hello' },
      schema: z.object({ headline: z.string().min(1) }),
    });
    registerComposition({
      id: 'schemaless',
      component: noopComponent,
      durationInFrames: 30,
      fps: 24,
      width: 640,
      height: 360,
    });

    const { client } = await makeClient();
    const out = payload(await client.callTool({ name: 'list_compositions', arguments: {} }));
    expect(out.compositions).toHaveLength(2);

    const hero = out.compositions.find((c: { id: string }) => c.id === 'hero');
    expect(hero).toMatchObject({
      id: 'hero',
      durationInFrames: 90,
      fps: 30,
      width: 1280,
      height: 720,
      defaultProps: { headline: 'Hello' },
    });
    // JSON Schema derived from the Zod prop schema, not hand-written.
    expect(hero.propsSchema.properties.headline).toEqual({ type: 'string', minLength: 1 });
    expect(hero.propsSchema.required).toContain('headline');

    const schemaless = out.compositions.find((c: { id: string }) => c.id === 'schemaless');
    expect(schemaless.propsSchema).toBeNull();
  });

  it('read_composition_props returns props + schema; unknown id is a tool error', async () => {
    registerComposition({
      id: 'hero',
      component: noopComponent,
      durationInFrames: 60,
      fps: 30,
      width: 1920,
      height: 1080,
      defaultProps: { headline: 'Hi' },
      schema: z.object({ headline: z.string() }),
    });
    const { client } = await makeClient();

    const out = payload(
      await client.callTool({ name: 'read_composition_props', arguments: { id: 'hero' } }),
    );
    expect(out).toMatchObject({ id: 'hero', props: { headline: 'Hi' } });
    expect(out.propsSchema.properties.headline.type).toBe('string');

    const missing = await client.callTool({
      name: 'read_composition_props',
      arguments: { id: 'nope' },
    });
    expect(missing.isError).toBe(true);
    expect(rawText(missing)).toContain('nope');
  });

  it('edit_composition_props validates against the composition Zod schema', async () => {
    const schema = z.object({ headline: z.string(), count: z.number().int() });
    registerComposition({
      id: 'hero',
      component: noopComponent,
      durationInFrames: 30,
      fps: 30,
      width: 64,
      height: 64,
      defaultProps: { headline: 'Hi', count: 0 },
      schema,
    });
    const { client } = await makeClient();

    const ok = payload(
      await client.callTool({
        name: 'edit_composition_props',
        arguments: { id: 'hero', props: { headline: 'Brief says hi', count: 3 } },
      }),
    );
    expect(ok.ok).toBe(true);
    expect(ok.props).toEqual({ headline: 'Brief says hi', count: 3 });

    const bad = await client.callTool({
      name: 'edit_composition_props',
      arguments: { id: 'hero', props: { headline: 42, count: 'many' } },
    });
    expect(bad.isError).toBe(true);
    expect(JSON.stringify(bad)).toContain('headline');
  });

  it('edit_composition_props falls back to brand-kit validation when no Zod schema is registered', async () => {
    registerComposition({
      id: 'plain',
      component: noopComponent,
      durationInFrames: 30,
      fps: 30,
      width: 64,
      height: 64,
    });
    const { client } = await makeClient();

    const ok = payload(
      await client.callTool({
        name: 'edit_composition_props',
        arguments: {
          id: 'plain',
          props: {
            name: 'Acme',
            primaryColor: '#ff0000',
            secondaryColor: '#00ff00',
            fontFamily: 'Inter',
          },
        },
      }),
    );
    expect(ok.ok).toBe(true);

    const bad = await client.callTool({
      name: 'edit_composition_props',
      arguments: { id: 'plain', props: { name: 'Acme', primaryColor: 'red' } },
    });
    expect(bad.isError).toBe(true);
    expect(JSON.stringify(bad)).toContain('primaryColor');
  });

  it('render_still captures via the renderer and writes the PNG', async () => {
    const dir = tmpDir();
    const calls: unknown[] = [];
    const { client } = await makeClient({
      captureStill: async (options) => {
        calls.push(options);
        return new Uint8Array([137, 80, 78, 71]);
      },
    });
    const out = join(dir, 'still.png');

    const result = payload(
      await client.callTool({
        name: 'render_still',
        arguments: { url: 'http://localhost:3000', frame: 7, out },
      }),
    );
    expect(result).toEqual({ out, bytes: 4 });
    expect(calls).toEqual([{ url: 'http://localhost:3000', frame: 7 }]);
    expect(existsSync(out)).toBe(true);
    expect([...readFileSync(out)]).toEqual([137, 80, 78, 71]);
    rmSync(dir, { recursive: true, force: true });
  });

  it('render_still surfaces capture failures as tool errors', async () => {
    const { client } = await makeClient({
      captureStill: async () => {
        throw new Error('Chrome crashed');
      },
    });
    const result = await client.callTool({
      name: 'render_still',
      arguments: { url: 'http://localhost:3000', frame: 0, out: '/tmp/x.png' },
    });
    expect(result.isError).toBe(true);
    expect(rawText(result)).toContain('Chrome crashed');
  });

  it('render_video (capture mode) runs the render job + stitch and completes the job', async () => {
    const dir = tmpDir();
    const jobOptions: unknown[] = [];
    const stitchCalls: Array<[string, Record<string, unknown>]> = [];
    const { client } = await makeClient({
      renderJob: async (options) => {
        jobOptions.push(options);
        options.onProgress?.({
          type: 'frame',
          framesDone: 1,
          framesTotal: 2,
          chunk: { start: 0, end: 2 },
        } as never);
        options.onProgress?.({
          type: 'frame',
          framesDone: 2,
          framesTotal: 2,
          chunk: { start: 0, end: 2 },
        } as never);
        return {
          outDir: dir,
          manifestPath: join(dir, 'render-manifest.json'),
          framesTotal: 2,
          framesRendered: 2,
          framesResumed: 0,
          completed: [{ start: 0, end: 2 }],
        };
      },
      stitch: async (input, options) => {
        stitchCalls.push([input, options as unknown as Record<string, unknown>]);
      },
    });

    const output = join(dir, 'out.mp4');
    const start = payload(
      await client.callTool({
        name: 'render_video',
        arguments: { url: 'http://localhost:3000', outDir: dir, start: 0, end: 2, output },
      }),
    );
    expect(start.jobId).toBeTruthy();

    let job: RenderJobStatus | undefined;
    for (let i = 0; i < 50; i++) {
      job = payload(
        await client.callTool({
          name: 'read_render_status',
          arguments: { jobId: start.jobId },
        }),
      );
      if (job!.status === 'completed' || job!.status === 'failed') break;
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(job!.status).toBe('completed');
    expect(job!.progress).toBe(1);
    expect(job!.outputUrl).toBe(output);
    expect(jobOptions[0]).toMatchObject({ url: 'http://localhost:3000', start: 0, end: 2, outDir: dir });
    expect(stitchCalls[0]![0]).toBe(dir);
    expect(stitchCalls[0]![1].output).toBe(output);
    rmSync(dir, { recursive: true, force: true });
  });

  it('render_video (stitch mode) stitches an existing frame directory without Chrome [BF-103]', async () => {
    const dir = tmpDir();
    const stitchCalls: Array<[string, Record<string, unknown>]> = [];
    const { client } = await makeClient({
      stitch: async (input, options) => {
        stitchCalls.push([input, options as unknown as Record<string, unknown>]);
      },
    });
    const output = join(dir, 'brief.mp4');

    const start = payload(
      await client.callTool({
        name: 'render_video',
        arguments: { inputDir: dir, output, fps: 12, codec: 'vp9' },
      }),
    );
    expect(start.jobId).toBeTruthy();

    let job: RenderJobStatus | undefined;
    for (let i = 0; i < 50; i++) {
      job = payload(
        await client.callTool({
          name: 'read_render_status',
          arguments: { jobId: start.jobId },
        }),
      );
      if (job!.status === 'completed' || job!.status === 'failed') break;
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(job!.status).toBe('completed');
    expect(job!.outputUrl).toBe(output);
    expect(stitchCalls[0]).toEqual([dir, { fps: 12, codec: 'vp9', output }]);
    rmSync(dir, { recursive: true, force: true });
  });

  it('render_video marks the job failed when rendering throws', async () => {
    const { client } = await makeClient({
      stitch: async () => {
        throw new Error('ffmpeg exploded');
      },
    });
    const start = payload(
      await client.callTool({
        name: 'render_video',
        arguments: { inputDir: '/frames', output: '/tmp/out.mp4' },
      }),
    );
    let job: RenderJobStatus | undefined;
    for (let i = 0; i < 50; i++) {
      job = payload(
        await client.callTool({ name: 'read_render_status', arguments: { jobId: start.jobId } }),
      );
      if (job!.status === 'completed' || job!.status === 'failed') break;
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(job!.status).toBe('failed');
    expect(job!.error).toContain('ffmpeg exploded');
  });

  it('render_video rejects invalid argument combinations without creating a job', async () => {
    const { client } = await makeClient();
    // Mixed modes: url+outDir AND inputDir.
    const mixed = await client.callTool({
      name: 'render_video',
      arguments: { url: 'http://x', outDir: '/f', start: 0, end: 2, inputDir: '/frames', output: '/o.mp4' },
    });
    expect(mixed.isError).toBe(true);
    // Neither mode complete.
    const neither = await client.callTool({
      name: 'render_video',
      arguments: { url: 'http://x' },
    });
    expect(neither.isError).toBe(true);
    // end must exceed start.
    const range = await client.callTool({
      name: 'render_video',
      arguments: { url: 'http://x', outDir: '/f', start: 5, end: 5, output: '/o.mp4' },
    });
    expect(range.isError).toBe(true);
  });

  it('read_render_status reports unknown jobs as tool errors', async () => {
    const { client } = await makeClient();
    const result = await client.callTool({
      name: 'read_render_status',
      arguments: { jobId: 'ghost' },
    });
    expect(result.isError).toBe(true);
    expect(rawText(result)).toContain('ghost');
  });

  it('inspect_timeline returns composition metadata; unknown id errors', async () => {
    registerComposition({
      id: 'hero',
      component: noopComponent,
      durationInFrames: 120,
      fps: 29.97,
      width: 1080,
      height: 1920,
    });
    const { client } = await makeClient();

    const out = payload(
      await client.callTool({ name: 'inspect_timeline', arguments: { compositionId: 'hero' } }),
    );
    expect(out).toEqual({
      compositionId: 'hero',
      durationInFrames: 120,
      fps: 29.97,
      width: 1080,
      height: 1920,
      sequences: [],
      series: [],
      loops: [],
    });

    const missing = await client.callTool({
      name: 'inspect_timeline',
      arguments: { compositionId: 'nope' },
    });
    expect(missing.isError).toBe(true);
  });

  it('unknown tool calls are tool errors', async () => {
    const { client } = await makeClient();
    const result = await client.callTool({ name: 'does_not_exist', arguments: {} });
    expect(result.isError).toBe(true);
    expect(rawText(result)).toContain('does_not_exist');
  });

  it('registerRenderJob stays available for renderer/CLI integration', async () => {
    const server = new BrandlyFramesMCPServer();
    server.registerRenderJob({ id: 'job-1', status: 'running', progress: 0.5 });
    server.registerRenderJob({ id: 'job-1', status: 'completed', progress: 1, outputUrl: '/out.mp4' });
    expect(server.getRenderJob('job-1')).toMatchObject({
      id: 'job-1',
      status: 'completed',
      progress: 1,
    });
    expect(server.getRenderJob('missing')).toBeUndefined();
  });
});
