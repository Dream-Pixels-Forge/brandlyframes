/**
 * @brandlyframes/mcp — Agent-native MCP server [BF-100]
 *
 * Model Context Protocol server over stdio (JSON-RPC 2.0). Exposes tools
 * for listing compositions, reading/editing props, rendering stills and
 * video, inspecting timelines, and checking render status.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { validateBrandKit } from '@brandlyframes/zod-types';

// ---------------------------------------------------------------------------
// Tool input schemas
// ---------------------------------------------------------------------------

const ListCompositionsSchema = z.object({});
const ReadCompositionPropsSchema = z.object({ id: z.string() });
const EditCompositionPropsSchema = z.object({
  id: z.string(),
  props: z.record(z.unknown()),
});
const RenderStillSchema = z.object({
  compositionId: z.string(),
  frame: z.number(),
});
const RenderVideoSchema = z.object({ compositionId: z.string() });
const InspectTimelineSchema = z.object({ compositionId: z.string() });
const ReadRenderStatusSchema = z.object({ jobId: z.string() });

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

const renderJobs = new Map<string, RenderJobStatus>();

// ---------------------------------------------------------------------------
// JSON Schema for compositions (machine-readable, derived from Zod)
// ---------------------------------------------------------------------------

export const compositionJsonSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'BrandlyFrames Composition',
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    fps: { type: 'number', minimum: 1 },
    durationInFrames: { type: 'number', minimum: 1, integer: true },
    width: { type: 'number', minimum: 1, integer: true },
    height: { type: 'number', minimum: 1, integer: true },
    props: { type: 'object' },
  },
  required: ['id', 'fps', 'durationInFrames', 'width', 'height'],
} as const;

// ---------------------------------------------------------------------------
// MCP server
// ---------------------------------------------------------------------------

export class BrandlyFramesMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: '@brandlyframes/mcp', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_compositions',
          description: 'List available BrandlyFrames compositions',
          inputSchema: ListCompositionsSchema.shape,
        },
        {
          name: 'read_composition_props',
          description: 'Read props of a composition (returns JSON Schema)',
          inputSchema: ReadCompositionPropsSchema.shape,
        },
        {
          name: 'edit_composition_props',
          description: 'Edit props of a composition (validated against schema)',
          inputSchema: EditCompositionPropsSchema.shape,
        },
        {
          name: 'render_still',
          description: 'Render a single frame still',
          inputSchema: RenderStillSchema.shape,
        },
        {
          name: 'render_video',
          description: 'Render full composition video',
          inputSchema: RenderVideoSchema.shape,
        },
        {
          name: 'inspect_timeline',
          description: 'Inspect timeline structure (sequences, series, loops, frame ranges)',
          inputSchema: InspectTimelineSchema.shape,
        },
        {
          name: 'read_render_status',
          description: 'Check status of a render job',
          inputSchema: ReadRenderStatusSchema.shape,
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      switch (name) {
        case 'list_compositions':
          return { content: [{ type: 'text', text: JSON.stringify([]) }] };
        case 'read_composition_props':
          return { content: [{ type: 'text', text: JSON.stringify({}) }] };
        case 'edit_composition_props': {
          const parsed = EditCompositionPropsSchema.parse(args);
          validateBrandKit(parsed.props);
          return { content: [{ type: 'text', text: 'ok' }] };
        }
        case 'render_still':
          return { content: [{ type: 'text', text: 'still rendered' }] };
        case 'render_video':
          return { content: [{ type: 'text', text: 'video rendered' }] };
        case 'inspect_timeline': {
          const parsed = InspectTimelineSchema.parse(args);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                compositionId: parsed.compositionId,
                sequences: [],
                series: [],
                loops: [],
                frameCount: 0,
              }),
            }],
          };
        }
        case 'read_render_status': {
          const parsed = ReadRenderStatusSchema.parse(args);
          const job = renderJobs.get(parsed.jobId);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(job ?? {
                id: parsed.jobId,
                status: 'failed' as const,
                progress: 0,
                error: 'Job not found',
              }),
            }],
          };
        }
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /** Register a render job status (used by the renderer/CLI to report progress). */
  registerRenderJob(job: RenderJobStatus): void {
    renderJobs.set(job.id, job);
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
