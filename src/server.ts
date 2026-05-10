import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerCustomerTools } from './tools/customer.tools.js';
import { registerJobTools } from './tools/job.tools.js';
import { registerAppointmentTools } from './tools/appointment.tools.js';
import { registerTechnicianTools } from './tools/technician.tools.js';
import { registerWebhookTools } from './tools/webhook.tools.js';
import { registerInvoiceTools } from './tools/invoice.tools.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'servicetitan-mcp',
    version: '0.1.0',
  });

  // Health check tool
  server.tool(
    'servicetitan___ping',
    'Health check and connection test for ServiceTitan MCP',
    {
      message: z.string().optional().describe('Optional message to echo'),
    },
    async ({ message }) => {
      return {
        content: [{
          type: 'text',
          text: `ServiceTitan MCP is healthy. ${message || 'Ready for FSM operations.'}`
        }]
      };
    }
  );

  // Register all domain tools
  registerCustomerTools(server);
  registerJobTools(server);
  registerAppointmentTools(server);
  registerTechnicianTools(server);
  registerWebhookTools(server);
  registerInvoiceTools(server);

  return server;
}