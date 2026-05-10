import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClient } from '../api/client.js';
import { createToolLogger } from '../utils/logger.js';
import { mapServiceTitanError, withRetry } from '../utils/error-handler.js';

const logger = createToolLogger('customer-tools');

// Zod schemas for strong typing and LLM guidance
const SearchCustomersSchema = z.object({
  query: z.string().optional().describe('Search term (name, phone, email, etc.)'),
  status: z.string().optional().describe('Customer status filter (e.g., Active, Inactive)'),
  page: z.number().int().min(1).default(1).describe('Page number for pagination'),
  pageSize: z.number().int().min(1).max(100).default(20).describe('Results per page'),
  includeRelated: z.boolean().default(false).describe('Include related jobs or locations if supported'),
});

const GetCustomerSchema = z.object({
  customerId: z.string().or(z.number()).describe('The unique ID of the customer'),
  includeRelated: z.boolean().default(true).describe('Include related data like jobs or locations'),
});

export function registerCustomerTools(server: McpServer) {
  const client = createClient();

  // Search customers
  server.tool(
    'servicetitan___search_customers',
    'Search for customers in ServiceTitan with flexible filters. Returns paginated results. Use for finding customers by name, contact info, or status before creating jobs or appointments.',
    SearchCustomersSchema.shape,
    async (params) => {
      const { query, status, page, pageSize, includeRelated } = params;
      logger.info({ params }, 'Searching customers');

      try {
        // Build query params - adjust field names based on actual API (common: q, filter, etc.)
        const searchParams: Record<string, any> = {
          page,
          pageSize,
          ...(query && { q: query }),
          ...(status && { status }),
          // Add more filters as needed (date ranges, etc.)
        };

        // Example endpoint structure - VERIFY with official docs / portal
        // Many use /crm/v2/tenant/{tenant}/customers or similar
        const url = client.buildUrl('crm', 'customers');

        const data: any = await withRetry(
          () => client.get(url, { params: searchParams }),
          3,
          'search_customers'
        );

        // Shape response for agent (add summary if large)
        const results = {
          total: data.totalCount || data.length || 0,
          page,
          pageSize,
          customers: data.customers || data.items || data || [],
          note: includeRelated ? 'Related data included where available' : 'Basic customer info only',
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(results, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'search_customers');
        return {
          content: [{
            type: 'text',
            text: `Error searching customers: ${stError.message}`,
          }],
        };
      }
    }
  );

  // Get single customer
  server.tool(
    'servicetitan___get_customer',
    'Retrieve detailed information for a specific customer by ID. Optionally includes related jobs, locations, or other data.',
    GetCustomerSchema.shape,
    async (params) => {
      const { customerId, includeRelated } = params;
      logger.info({ customerId, includeRelated }, 'Getting customer details');

      try {
        const url = client.buildUrl('crm', 'customers', customerId);

        const data = await withRetry(
          () => client.get(url),
          3,
          'get_customer'
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'get_customer');
        return {
          content: [{
            type: 'text',
            text: `Error getting customer: ${stError.message}`,
          }],
        };
      }
    }
  );

  logger.info('Customer tools registered');
}

// TODO: Add create_customer, update_customer tools following the same pattern