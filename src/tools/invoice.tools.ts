import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClient } from '../api/client.js';
import { createToolLogger } from '../utils/logger.js';
import { mapServiceTitanError, withRetry } from '../utils/error-handler.js';

const logger = createToolLogger('invoice-tools');

const SearchInvoicesSchema = z.object({
  status: z.string().optional(),
  customerId: z.string().or(z.number()).optional(),
  jobId: z.string().or(z.number()).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

const GetInvoiceSchema = z.object({
  invoiceId: z.string().or(z.number()).describe('The unique ID of the invoice'),
});

const CreateInvoiceFromJobSchema = z.object({
  jobId: z.string().or(z.number()).describe('The job to invoice'),
  dueDate: z.string().optional().describe('Invoice due date (ISO 8601)'),
  notes: z.string().optional().describe('Notes to attach to the invoice'),
});

const RecordPaymentSchema = z.object({
  invoiceId: z.string().or(z.number()).describe('The invoice being paid'),
  amount: z.number().positive().describe('Payment amount (positive)'),
  method: z.enum(['cash', 'check', 'credit', 'ach', 'other']).describe('Payment method'),
  reference: z.string().optional().describe('Check number, transaction ID, or other reference'),
  paidOn: z.string().optional().describe('Date payment was received (ISO 8601). Defaults to today.'),
});

export function registerInvoiceTools(server: McpServer) {
  const client = createClient();

  server.tool(
    'servicetitan___search_invoices',
    'Search invoices with filters (status, date range, customer, job). High value for financial automation and collections.',
    SearchInvoicesSchema.shape,
    async (params) => {
      logger.info({ params }, 'Searching invoices');
      try {
        const url = client.buildUrl('accounting', 'invoices');
        const data = await withRetry(() => client.get<any>(url, { params }), 3, 'search_invoices');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'search_invoices');
        return { content: [{ type: 'text', text: `Error: ${stError.message}` }] };
      }
    }
  );

  server.tool(
    'servicetitan___get_invoice',
    'Retrieve full details for a specific invoice by ID, including line items, payments, and totals.',
    GetInvoiceSchema.shape,
    async (params) => {
      const { invoiceId } = params;
      logger.info({ invoiceId }, 'Getting invoice');
      try {
        const url = client.buildUrl('accounting', 'invoices', invoiceId);
        const data = await withRetry(() => client.get<any>(url), 3, 'get_invoice');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'get_invoice');
        return { content: [{ type: 'text', text: `Error getting invoice: ${stError.message}` }] };
      }
    }
  );

  server.tool(
    'servicetitan___create_invoice_from_job',
    'Generate a new invoice from an existing completed job. Optionally set a due date and notes.',
    CreateInvoiceFromJobSchema.shape,
    async (params) => {
      logger.info({ params }, 'Creating invoice from job');
      try {
        const url = client.buildUrl('accounting', 'invoices');
        const data = await withRetry(
          () => client.post<any>(url, params),
          3,
          'create_invoice_from_job'
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, invoice: data }, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'create_invoice_from_job');
        return { content: [{ type: 'text', text: `Error creating invoice: ${stError.message}` }] };
      }
    }
  );

  server.tool(
    'servicetitan___record_payment',
    'Record a payment against an invoice. Use after a customer pays via cash, check, ACH, or credit card.',
    RecordPaymentSchema.shape,
    async (params) => {
      const { invoiceId, amount, method, reference, paidOn } = params;
      logger.info({ invoiceId, amount, method }, 'Recording payment');
      try {
        const url = client.buildUrl('accounting', 'payments');
        const body = {
          invoiceId,
          amount,
          method,
          ...(reference && { reference }),
          paidOn: paidOn || new Date().toISOString(),
        };
        const data = await withRetry(
          () => client.post<any>(url, body),
          3,
          'record_payment'
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, payment: data }, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'record_payment');
        return { content: [{ type: 'text', text: `Error recording payment: ${stError.message}` }] };
      }
    }
  );

  logger.info('Invoice tools registered');
}
