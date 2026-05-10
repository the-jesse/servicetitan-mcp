import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClient } from '../api/client.js';
import { createToolLogger } from '../utils/logger.js';
import { mapServiceTitanError, withRetry } from '../utils/error-handler.js';

const logger = createToolLogger('job-tools');

// Placeholder schemas - expand with real fields from API
const SearchJobsSchema = z.object({
  status: z.string().optional().describe('Job status (Open, Scheduled, InProgress, Completed, etc.)'),
  customerId: z.string().or(z.number()).optional(),
  technicianId: z.string().or(z.number()).optional(),
  dateFrom: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
  dateTo: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export function registerJobTools(server: McpServer) {
  const client = createClient();

  server.tool(
    'servicetitan___search_jobs',
    'Search for jobs with rich filters (status, dates, customer, technician). Core tool for daily operations and dispatching.',
    SearchJobsSchema.shape,
    async (params) => {
      logger.info({ params }, 'Searching jobs');
      try {
        const searchParams = { ...params };
        // Example URL - adjust namespace (often dispatch or jpm)
        const url = client.buildUrl('dispatch', 'jobs');

        const data = await withRetry(
          () => client.get<any>(url, { params: searchParams }),
          3,
          'search_jobs'
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              total: data.totalCount || 0,
              jobs: data.jobs || data.items || data || [],
            }, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'search_jobs');
        return {
          content: [{
            type: 'text',
            text: `Error searching jobs: ${stError.message}`,
          }],
        };
      }
    }
  );

  // TODO: Add get_job, create_job, update_job_status, assign_technician tools
  logger.info('Job tools placeholder registered (expand with full implementation)');
}