import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClient } from '../api/client.js';
import { createToolLogger } from '../utils/logger.js';
import { mapServiceTitanError, withRetry } from '../utils/error-handler.js';

const logger = createToolLogger('technician-tools');

export function registerTechnicianTools(server: McpServer) {
  const client = createClient();

  server.tool(
    'servicetitan___list_technicians',
    'List technicians with optional filters (status, skills, location). Useful for dispatching and availability checks.',
    {
      status: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
    },
    async (params) => {
      logger.info({ params }, 'Listing technicians');
      try {
        const url = client.buildUrl('settings', 'technicians');
        const data = await withRetry(() => client.get(url, { params }), 3, 'list_technicians');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'list_technicians');
        return { content: [{ type: 'text', text: `Error: ${stError.message}` }] };
      }
    }
  );

  // TODO: Add get_technician, get_availability, find_available_technicians (composite tool)
  logger.info('Technician tools placeholder registered');
}