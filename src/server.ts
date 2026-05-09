import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
// TODO: Import tool modules and auth

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'servicetitan-mcp',
    version: '0.1.0',
  });

  // Example placeholder tool - replace with real implementations
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

  // TODO: Register all domain tools from ./tools/*
  // Example future:
  // import { registerCustomerTools } from './tools/customer.tools.js';
  // registerCustomerTools(server);

  return server;
}