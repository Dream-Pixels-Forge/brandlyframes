/**
 * @brandlyframes/mcp — Agent-native MCP server [BF-100]
 *
 * Model Context Protocol server over stdio (JSON-RPC 2.0). Exposes tools for
 * listing compositions, reading/editing props, rendering stills and video,
 * inspecting timelines, and checking render status — reusing the renderer
 * (`captureFrame`, `runRenderJob`, `stitchFrames`) and CLI (`createCdpLauncher`)
 * internals. Composition prop schemas are exported as JSON Schema from Zod
 * [BF-101].
 */

import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { z } from 'zod';
import { getCompositions, validateCompositionProps } from 'brandlyframes';
import { validateBrandKit } from '@brandlyframes/zod-types';
import {
  captureFrame,
  runRenderJob,
  stitchFrames,
  type CaptureFrameOptions,
  type LauncherFn,
  type RenderJobOptions,
  type RenderJobResult,
  type StitchFramesOptions,
} from '@brandlyframes/renderer';
import { createCdpLauncher } from '@brandlyframes/cli/cdp-launcher';

// ---------------------------------------------------------------------------
// Tool input schemas (Zod is the single source; JSON Schema is derived [BF-101])
// ---------------------------------------------------------------------------

const ListCompositionsInput = z.object({});
const ReadCompositionPropsInput = z.object({ id: z.string().min(1) });
const EditCompositionPropsInput = z.object({
  id: z.string().min(1),
  props: z.record(z.string(), z.unknown()),
});
const RenderStillInput = z.object({
  url: z.string().min(1),
  frame: z.number().int().min(0),
  out: z.string().min(1),
});
const RenderVideoInput = z
  .object({
    /** Capture mode: composition preview URL. */
    url: z.string().min(1).optional(),
    /** Capture mode: directory for captured frame-%06d.png files. */
    outDir: z.string().min(1).optional(),
    /** Capture mode: first frame (inclusive). */
    start: z.number().int().min(0).optional(),
    /** Capture mode: one past the last frame (exclusive). */
    end: z.number().int().positive().optional(),
    /** Stitch mode: directory of numbered frame images (ffmpeg-only path). */
    inputDir: z.string().min(1).optional(),
    /** Output video path (both modes). */
    output: z.string().min(1),
    fps: z.number().positive().optional(),
    codec: z
      .enum(['h264', 'h265', 'vp8', 'vp9', 'prores', 'gif', 'png-sequence'])
      .optional(),
    concurrency: z.number().int().min(1).optional(),
  })
  .superRefine((input, ctx) => {
    const captureFields = input.url !== undefined || input.outDir !== undefined ||
      input.start !== undefined || input.end !== undefined || input.concurrency !== undefined;
    const stitchFields = input.inputDir !== undefined;
    if (captureFields && stitchFields) {
      ctx.addIssue({
        code: 'custom',
        message:
          'render_video takes either { url, outDir, start, end } (capture, needs Chrome) or { inputDir } (stitch, needs ffmpeg) — not both.',
      });
    } else if (stitchFields) {
      if (input.url || input.outDir || input.start !== undefined || input.end !== undefined) {
        ctx.addIssue({ code: 'custom', message: 'inputDir (stitch mode) cannot be combined with url/outDir/start/end.' });
      }
    } else if (!(input.url && input.outDir && input.start !== undefined && input.end !== undefined)) {
      ctx.addIssue({
        code: 'custom',
        message: 'render_video requires { url, outDir, start, end } (capture mode) or { inputDir } (stitch mode).',
      });
    } else if (input.end <= input.start) {
      ctx.addIssue({ code: 'custom', message: `end (${input.end}) must be greater than start (${input.start}).` });
    }
  });
const InspectTimelineInput = z.object({ compositionId: z.string().min(1) });
const ReadRenderStatusInput = z.object({ jobId: z.string().min(1) });

// ---------------------------------------------------------------------------
// Render job status
// ---------------------------------------------------------------------------

export type RenderJobStatus = {
  readonly id: string;
  readonly status: 'pending' | 'running' | 'completed' | 'failed';
  readonly progress: number;
  readonly outputUrl?: string;
  readonly error?: string;
};

/**
 * Injectable renderer internals: real implementations are the defaults
 * (mirroring the CLI); tests inject fakes.
 */
export interface McpServerDeps {
  captureStill?: (options: CaptureFrameOptions, launcher: LauncherFn) => Promise<Uint8Array>;
  renderJob?: (options: RenderJobOptions, launcher: LauncherFn) => Promise<RenderJobResult>;
  stitch?: (inputDir: string, options: StitchFramesOptions) => Promise<void>;
  launcher?: LauncherFn;
}

/** JSON Schema derived from a Zod prop schema, shaped for agent input [BF-101]. */
export const propsJsonSchema = (schema: z.ZodType): Tool['inputSchema'] =>
  z.toJSONSchema(schema, { io: 'input' }) as Tool['inputSchema'];

/** A composition as exposed to agents: metadata + JSON Schema props contract. */
export interface CompositionSummary {
  readonly id: string;
  readonly durationInFrames: number;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly defaultProps?: unknown;
  readonly propsSchema: Tool['inputSchema'] | null;
}

const listCompositionSummaries = (): CompositionSummary[] =>
  getCompositions().map((c) => ({
    id: c.id,
    durationInFrames: c.durationInFrames,
    fps: c.fps,
    width: c.width,
    height: c.height,
    ...(c.defaultProps !== undefined ? { defaultProps: c.defaultProps } : {}),
    propsSchema: c.schema ? propsJsonSchema(c.schema as z.ZodType) : null,
  }));

const findComposition = (id: string) => getCompositions().find((c) => c.id === id);

// ---------------------------------------------------------------------------
// MCP server
// ---------------------------------------------------------------------------

export class BrandlyFramesMCPServer {
  private readonly server: Server;
  private readonly deps: Required<McpServerDeps>;
  private readonly renderJobs = new Map<string, RenderJobStatus>();

  constructor(deps: McpServerDeps = {}) {
    this.deps = {
      captureStill: deps.captureStill ?? ((options, launcher) => captureFrame(options, launcher)),
      renderJob: deps.renderJob ?? ((options, launcher) => runRenderJob(options, launcher)),
      stitch: deps.stitch ?? ((input, options) => stitchFrames(input, options)),
      launcher: deps.launcher ?? createCdpLauncher,
    };
    this.server = new Server(
      { name: '@brandlyframes/mcp', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );

    this.server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: [
        {
          name: 'list_compositions',
          description:
            'List registered BrandlyFrames compositions with metadata and a JSON Schema of their props (derived from the Zod schema).',
          inputSchema: propsJsonSchema(ListCompositionsInput),
        },
        {
          name: 'read_composition_props',
          description: 'Read the default props and JSON Schema of one composition by id.',
          inputSchema: propsJsonSchema(ReadCompositionPropsInput),
        },
        {
          name: 'edit_composition_props',
          description:
            'Validate props for a composition against its Zod schema (brand-kit fallback) and return the parsed props.',
          inputSchema: propsJsonSchema(EditCompositionPropsInput),
        },
        {
          name: 'render_still',
          description: 'Capture a single frame of a composition URL as a PNG still (needs Chrome).',
          inputSchema: propsJsonSchema(RenderStillInput),
        },
        {
          name: 'render_video',
          description:
            'Render a video and poll read_render_status with the returned jobId. Capture mode { url, outDir, start, end } (needs Chrome + ffmpeg) or stitch mode { inputDir, output } (needs ffmpeg only).',
          inputSchema: propsJsonSchema(RenderVideoInput),
        },
        {
          name: 'inspect_timeline',
          description: 'Inspect composition metadata (duration, fps, dimensions).',
          inputSchema: propsJsonSchema(InspectTimelineInput),
        },
        {
          name: 'read_render_status',
          description: 'Read the status of a render job started via render_video.',
          inputSchema: propsJsonSchema(ReadRenderStatusInput),
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) =>
      this.dispatch(request.params.name, request.params.arguments),
    );
  }

  /** Runs one tool call; every failure becomes an isError text result. */
  private async dispatch(name: string, rawArgs: unknown) {
    try {
      const text = JSON.stringify(await this.handle(name, rawArgs));
      return { content: [{ type: 'text' as const, text }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: message }],
        isError: true,
      };
    }
  }

  private async handle(name: string, rawArgs: unknown): Promise<unknown> {
    switch (name) {
      case 'list_compositions': {
        ListCompositionsInput.parse(rawArgs);
        return { compositions: listCompositionSummaries() };
      }
      case 'read_composition_props': {
        const { id } = ReadCompositionPropsInput.parse(rawArgs);
        const composition = findComposition(id);
        if (!composition) throw new Error(`Unknown composition: "${id}". Call list_compositions first.`);
        return {
          id: composition.id,
          ...(composition.defaultProps !== undefined ? { props: composition.defaultProps } : {}),
          propsSchema: composition.schema ? propsJsonSchema(composition.schema as z.ZodType) : null,
        };
      }
      case 'edit_composition_props': {
        const { id, props } = EditCompositionPropsInput.parse(rawArgs);
        const composition = findComposition(id);
        if (!composition) throw new Error(`Unknown composition: "${id}". Call list_compositions first.`);
        if (composition.schema) {
          validateCompositionProps(composition.schema, props, id);
          return { ok: true, id, props: (composition.schema as z.ZodType).parse(props) };
        }
        // No custom schema: fall back to the SDK brand-kit contract (zod-types).
        const validated = validateBrandKit(props);
        return {
          ok: true,
          id,
          props: validated,
          note: 'No Zod schema registered for this composition; props validated against the BrandlyFrames brand kit.',
        };
      }
      case 'render_still': {
        const { url, frame, out } = RenderStillInput.parse(rawArgs);
        const png = await this.deps.captureStill({ url, frame }, this.deps.launcher);
        writeFileSync(out, png);
        return { out, bytes: png.byteLength };
      }
      case 'render_video': {
        const input = RenderVideoInput.parse(rawArgs);
        const jobId = randomUUID();
        this.renderJobs.set(jobId, { id: jobId, status: 'running', progress: 0 });
        void this.runRenderVideo(jobId, input).catch(() => {
          /* status already recorded by runRenderVideo */
        });
        return { jobId };
      }
      case 'inspect_timeline': {
        const { compositionId } = InspectTimelineInput.parse(rawArgs);
        const composition = findComposition(compositionId);
        if (!composition) {
          throw new Error(`Unknown composition: "${compositionId}". Call list_compositions first.`);
        }
        return {
          compositionId: composition.id,
          durationInFrames: composition.durationInFrames,
          fps: composition.fps,
          width: composition.width,
          height: composition.height,
          sequences: [],
          series: [],
          loops: [],
        };
      }
      case 'read_render_status': {
        const { jobId } = ReadRenderStatusInput.parse(rawArgs);
        const job = this.renderJobs.get(jobId);
        if (!job) throw new Error(`Unknown render job: "${jobId}".`);
        return job;
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /** Fire-and-forget render pipeline; updates the job status as it goes. */
  private async runRenderVideo(
    jobId: string,
    input: z.infer<typeof RenderVideoInput>,
  ): Promise<void> {
    const update = (patch: Partial<RenderJobStatus>) => {
      const job = this.renderJobs.get(jobId);
      if (job) this.renderJobs.set(jobId, { ...job, ...patch });
    };
    try {
      const output = resolve(input.output!);
      const fps = input.fps;
      const codec = input.codec;
      if (input.inputDir !== undefined) {
        // Stitch mode: numbered frames already exist (ffmpeg-only path [BF-103]).
        await this.deps.stitch(input.inputDir, {
          ...(fps !== undefined ? { fps } : {}),
          ...(codec !== undefined ? { codec } : {}),
          output,
        });
      } else {
        // Capture mode: Chrome renders frames, then ffmpeg stitches the MP4.
        const result = await this.deps.renderJob(
          {
            url: input.url!,
            start: input.start!,
            end: input.end!,
            outDir: input.outDir!,
            ...(input.concurrency !== undefined ? { concurrency: input.concurrency } : {}),
            resume: true,
            onProgress: (progress) => {
              if (progress.type === 'frame' && progress.framesTotal > 0) {
                update({ progress: progress.framesDone / progress.framesTotal });
              }
            },
          },
          this.deps.launcher,
        );
        void result;
        await this.deps.stitch(input.outDir!, {
          ...(fps !== undefined ? { fps } : {}),
          ...(codec !== undefined ? { codec } : {}),
          output,
        });
      }
      update({ status: 'completed', progress: 1, outputUrl: output });
    } catch (error) {
      update({
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Register a render job status (used by the renderer/CLI to report progress). */
  registerRenderJob(job: RenderJobStatus): void {
    this.renderJobs.set(job.id, job);
  }

  /** Read a tracked render job (tests / CLI integration). */
  getRenderJob(jobId: string): RenderJobStatus | undefined {
    return this.renderJobs.get(jobId);
  }

  /** Connect to a transport (in-process transports in tests, stdio in prod). */
  async connect(transport: Transport): Promise<void> {
    await this.server.connect(transport);
  }

  /** Serve MCP over stdio. */
  async run(): Promise<void> {
    await this.connect(new StdioServerTransport());
  }
}
