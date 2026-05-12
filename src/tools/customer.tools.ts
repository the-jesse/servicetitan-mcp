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

const AddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
}).describe('Service address');

const CreateCustomerSchema = z.object({
  name: z.string().describe('Customer name (individual or business)'),
  type: z.enum(['Residential', 'Commercial']).optional().describe('Customer type'),
  phone: z.string().optional().describe('Primary contact phone'),
  email: z.string().optional().describe('Primary contact email'),
  address: AddressSchema.optional(),
  notes: z.string().optional().describe('Free-form notes attached to the customer record'),
});

const UpdateCustomerSchema = z.object({
  customerId: z.string().or(z.number()).describe('The unique ID of the customer to update'),
  name: z.string().optional(),
  type: z.enum(['Residential', 'Commercial']).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: AddressSchema.optional(),
  notes: z.string().optional(),
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

  server.tool(
    'servicetitan___create_customer',
    'Create a new customer record in ServiceTitan. Use search_customers first to avoid duplicates.',
    CreateCustomerSchema.shape,
    async (params) => {
      logger.info({ params }, 'Creating customer');
      try {
        const url = client.buildUrl('crm', 'customers');
        const data = await withRetry(
          () => client.post<any>(url, params),
          3,
          'create_customer'
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, customer: data }, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'create_customer');
        return {
          content: [{
            type: 'text',
            text: `Error creating customer: ${stError.message}`,
          }],
        };
      }
    }
  );

  server.tool(
    'servicetitan___update_customer',
    'Update an existing customer record. Only provided fields are changed; omit fields you want to leave alone.',
    UpdateCustomerSchema.shape,
    async (params) => {
      const { customerId, ...patch } = params;
      logger.info({ customerId, fields: Object.keys(patch) }, 'Updating customer');
      try {
        const url = client.buildUrl('crm', 'customers', customerId);
        const data = await withRetry(
          () => client.patch<any>(url, patch),
          3,
          'update_customer'
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, customer: data }, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'update_customer');
        return {
          content: [{
            type: 'text',
            text: `Error updating customer: ${stError.message}`,
          }],
        };
      }
    }
  );

  logger.info('Customer tools registered');
}