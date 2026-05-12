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

const GetAppointmentSchema = z.object({
  appointmentId: z.string().or(z.number()).describe('The unique ID of the appointment'),
  includeRelated: z.boolean().default(true).describe('Include related job, customer, and technician data'),
});

const CreateAppointmentSchema = z.object({
  jobId: z.string().or(z.number()).describe('The job this appointment belongs to'),
  technicianId: z.string().or(z.number()).optional().describe('Technician assigned to the appointment'),
  start: z.string().describe('Scheduled start datetime (ISO 8601, e.g. 2026-05-12T09:00:00Z)'),
  end: z.string().optional().describe('Scheduled end datetime (ISO 8601)'),
  notes: z.string().optional().describe('Free-form notes for the appointment'),
});

const RescheduleAppointmentSchema = z.object({
  appointmentId: z.string().or(z.number()).describe('The unique ID of the appointment to reschedule'),
  start: z.string().describe('New start datetime (ISO 8601)'),
  end: z.string().optional().describe('New end datetime (ISO 8601)'),
  reason: z.string().optional().describe('Reason for rescheduling (audit trail)'),
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

  server.tool(
    'servicetitan___get_appointment',
    'Retrieve full details for a specific appointment by ID, including its job, customer, and assigned technician.',
    GetAppointmentSchema.shape,
    async (params) => {
      const { appointmentId } = params;
      logger.info({ appointmentId }, 'Getting appointment');
      try {
        const url = client.buildUrl('dispatch', 'appointments', appointmentId);
        const data = await withRetry(
          () => client.get<any>(url),
          3,
          'get_appointment'
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'get_appointment');
        return {
          content: [{
            type: 'text',
            text: `Error getting appointment: ${stError.message}`,
          }],
        };
      }
    }
  );

  server.tool(
    'servicetitan___create_appointment',
    'Create a new appointment on an existing job. Use search_jobs to confirm the jobId first.',
    CreateAppointmentSchema.shape,
    async (params) => {
      logger.info({ params }, 'Creating appointment');
      try {
        const url = client.buildUrl('dispatch', 'appointments');
        const data = await withRetry(
          () => client.post<any>(url, params),
          3,
          'create_appointment'
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, appointment: data }, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'create_appointment');
        return {
          content: [{
            type: 'text',
            text: `Error creating appointment: ${stError.message}`,
          }],
        };
      }
    }
  );

  server.tool(
    'servicetitan___reschedule_appointment',
    'Reschedule an existing appointment to a new start (and optionally end) time. Include a reason for the audit trail.',
    RescheduleAppointmentSchema.shape,
    async (params) => {
      const { appointmentId, start, end, reason } = params;
      logger.info({ appointmentId, start, end }, 'Rescheduling appointment');
      try {
        const url = client.buildUrl('dispatch', 'appointments', appointmentId);
        const data = await withRetry(
          () => client.patch<any>(url, { start, ...(end && { end }), ...(reason && { reason }) }),
          3,
          'reschedule_appointment'
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, appointment: data }, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'reschedule_appointment');
        return {
          content: [{
            type: 'text',
            text: `Error rescheduling appointment: ${stError.message}`,
          }],
        };
      }
    }
  );

  logger.info('Appointment tools registered');
}