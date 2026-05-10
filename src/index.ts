import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from 'dotenv';
import { createServer } from './server.js';

config();

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ServiceTitan MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});