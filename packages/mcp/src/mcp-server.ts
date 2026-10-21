import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { validateBrandKit } from '@brandlyframes/zod-types';

const ListCompositionsSchema = z.object({});
const ReadCompositionPropsSchema = z.object({ id: z.string() });
const EditCompositionPropsSchema = z.object({
  id: z.string(),
  props: z.record(z.unknown()),
});
const RenderStillSchema = z.object({ compositionId: z.string(), frame: z.number() });
const RenderVideoSchema = z.object({ compositionId: z.string() });

export class BrandlyFramesMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: '@brandlyframes/mcp', version: '0.1.0' },
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
          description: 'Read props of a composition',
          inputSchema: ReadCompositionPropsSchema.shape,
        },
        {
          name: 'edit_composition_props',
          description: 'Edit props of a composition',
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
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
