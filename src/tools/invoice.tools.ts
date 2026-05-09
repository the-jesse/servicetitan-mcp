import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClient } from '../api/client.js';
import { createToolLogger } from '../utils/logger.js';
import { mapServiceTitanError, withRetry } from '../utils/error-handler.js';

const logger = createToolLogger('invoice-tools');

export function registerInvoiceTools(server: McpServer) {
  const client = createClient();

  server.tool(
    'servicetitan___search_invoices',
    'Search invoices with filters (status, date range, customer, job). High value for financial automation and collections.',
    {
      status: z.string().optional(),
      customerId: z.string().or(z.number()).optional(),
      jobId: z.string().or(z.number()).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
    },
    async (params) => {
      logger.info({ params }, 'Searching invoices');
      try {
        const url = client.buildUrl('accounting', 'invoices');
        const data = await withRetry(() => client.get(url, { params }), 3, 'search_invoices');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'search_invoices');
        return { content: [{ type: 'text', text: `Error: ${stError.message}` }] };
      }
    }
  );

  // TODO: Add create_invoice_from_job, record_payment, get_invoice
  logger.info('Invoice tools placeholder registered');
}