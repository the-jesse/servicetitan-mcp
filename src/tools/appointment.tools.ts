import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClient } from '../api/client.js';
import { createToolLogger } from '../utils/logger.js';
import { mapServiceTitanError, withRetry } from '../utils/error-handler.js';
import { PaginationSchema, CommonFiltersSchema } from '../utils/pagination.js';

const logger = createToolLogger('appointment-tools');

const SearchAppointmentsSchema = z.object({
  ...CommonFiltersSchema,
  ...PaginationSchema,
  jobId: z.string().or(z.number()).optional().describe('Filter appointments for a specific job'),
  technicianId: z.string().or(z.number()).optional().describe('Filter by technician'),
  customerId: z.string().or(z.number()).optional(),
});

export function registerAppointmentTools(server: McpServer) {
  const client = createClient();

  server.tool(
    'servicetitan___search_appointments',
    'Search appointments by date range, job, technician, or status. Critical for scheduling and daily dispatching workflows.',
    SearchAppointmentsSchema.shape,
    async (params) => {
      logger.info({ params }, 'Searching appointments');
      try {
        const searchParams = { ...params };
        // Common namespace: dispatch or jpm
        const url = client.buildUrl('dispatch', 'appointments');

        const data = await withRetry(
          () => client.get(url, { params: searchParams }),
          3,
          'search_appointments'
        );

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'search_appointments');
        return {
          content: [{
            type: 'text',
            text: `Error searching appointments: ${stError.message}`,
          }],
        };
      }
    }
  );

  // TODO: Add create_appointment, reschedule_appointment, get_appointment
  logger.info('Appointment tools placeholder registered');
}