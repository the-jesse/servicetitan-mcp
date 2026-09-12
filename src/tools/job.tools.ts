import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClient } from '../api/client.js';
import { createToolLogger } from '../utils/logger.js';
import { mapServiceTitanError, withRetry } from '../utils/error-handler.js';
import {
  WriteGateFields,
  evaluateWriteGate,
  gatedResponse,
  stripGateFields,
} from '../utils/write-gate.js';

const logger = createToolLogger('job-tools');

const SearchJobsSchema = z.object({
  status: z.string().optional().describe('Job status (Open, Scheduled, InProgress, Completed, etc.)'),
  customerId: z.string().or(z.number()).optional(),
  technicianId: z.string().or(z.number()).optional(),
  dateFrom: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
  dateTo: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

const GetJobSchema = z.object({
  jobId: z.string().or(z.number()).describe('The unique ID of the job'),
  includeRelated: z.boolean().default(true).describe('Include related data like appointments, invoices, or notes'),
});

const CreateJobSchema = z.object({
  customerId: z.string().or(z.number()).describe('The customer ID to create the job for'),
  jobTypeId: z.string().or(z.number()).optional().describe('Job type ID (e.g., Plumbing, HVAC)'),
  priority: z.string().optional().describe('Job priority (e.g., Normal, High, Emergency)'),
  summary: z.string().optional().describe('Brief description or summary of the job'),
  technicianId: z.string().or(z.number()).optional().describe('Technician to assign to the job'),
  scheduledStart: z.string().optional().describe('Scheduled start datetime (ISO 8601, e.g. 2026-05-10T09:00:00Z)'),
  scheduledEnd: z.string().optional().describe('Scheduled end datetime (ISO 8601)'),
  locationId: z.string().or(z.number()).optional().describe('Service location ID'),
  ...WriteGateFields,
});

const UpdateJobStatusSchema = z.object({
  jobId: z.string().or(z.number()).describe('The unique ID of the job to update'),
  status: z.string().describe('New status to set (e.g., Scheduled, InProgress, Completed, Canceled)'),
  note: z.string().optional().describe('Optional note explaining the status change'),
  ...WriteGateFields,
});

const AssignTechnicianSchema = z.object({
  jobId: z.string().or(z.number()).describe('The unique ID of the job'),
  technicianId: z.string().or(z.number()).describe('The unique ID of the technician to assign'),
  appointmentId: z.string().or(z.number()).optional().describe('Specific appointment ID to assign to (if applicable)'),
  ...WriteGateFields,
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
        const url = client.buildUrl('dispatch', 'jobs');

        const data: any = await withRetry(
          () => client.get(url, { params: searchParams }),
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

  server.tool(
    'servicetitan___get_job',
    'Retrieve full details for a specific job by ID, including appointments, invoices, and related data.',
    GetJobSchema.shape,
    async (params) => {
      const { jobId, includeRelated } = params;
      logger.info({ jobId, includeRelated }, 'Getting job details');
      try {
        const url = client.buildUrl('dispatch', 'jobs', jobId);
        const data: any = await withRetry(
          () => client.get(url),
          3,
          'get_job'
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(data, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'get_job');
        return {
          content: [{
            type: 'text',
            text: `Error getting job: ${stError.message}`,
          }],
        };
      }
    }
  );

  server.tool(
    'servicetitan___create_job',
    'GATED WRITE. Create a new job. Defaults to dryRun=true (no network). Live write requires dryRun=false, confirm=true, and ST_ENV=sandbox or ST_ALLOW_LIVE_WRITES=1. Endpoint path still unverified.',
    CreateJobSchema.shape,
    async (params) => {
      logger.info({ params }, 'Creating job');
      const decision = evaluateWriteGate(params);
      const body = stripGateFields(params);
      if (!decision.allowed) {
        return gatedResponse('servicetitan___create_job', decision, {
          method: 'POST',
          pathHint: 'dispatch/jobs',
          body,
        });
      }
      try {
        const url = client.buildUrl('dispatch', 'jobs');
        const data: any = await withRetry(
          () => client.post(url, body),
          3,
          'create_job'
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              job: data,
            }, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'create_job');
        return {
          content: [{
            type: 'text',
            text: `Error creating job: ${stError.message}`,
          }],
        };
      }
    }
  );

  server.tool(
    'servicetitan___update_job_status',
    'GATED WRITE. Update job status. Defaults to dryRun=true. Live write requires dryRun=false, confirm=true, and ST_ENV=sandbox or ST_ALLOW_LIVE_WRITES=1.',
    UpdateJobStatusSchema.shape,
    async (params) => {
      const { jobId, status, note } = params;
      logger.info({ jobId, status }, 'Updating job status');
      const decision = evaluateWriteGate(params);
      if (!decision.allowed) {
        return gatedResponse('servicetitan___update_job_status', decision, {
          method: 'PATCH',
          pathHint: `dispatch/jobs/${jobId}`,
          body: { status, ...(note && { note }) },
        });
      }
      try {
        const url = client.buildUrl('dispatch', 'jobs', jobId);
        const data: any = await withRetry(
          () => client.patch(url, { status, ...(note && { note }) }),
          3,
          'update_job_status'
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              job: data,
            }, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'update_job_status');
        return {
          content: [{
            type: 'text',
            text: `Error updating job status: ${stError.message}`,
          }],
        };
      }
    }
  );

  server.tool(
    'servicetitan___assign_technician',
    'GATED WRITE. Assign a technician. Defaults to dryRun=true. Live write requires dryRun=false, confirm=true, and ST_ENV=sandbox or ST_ALLOW_LIVE_WRITES=1.',
    AssignTechnicianSchema.shape,
    async (params) => {
      const { jobId, technicianId, appointmentId } = params;
      logger.info({ jobId, technicianId, appointmentId }, 'Assigning technician');
      const decision = evaluateWriteGate(params);
      if (!decision.allowed) {
        return gatedResponse('servicetitan___assign_technician', decision, {
          method: 'PATCH',
          pathHint: appointmentId
            ? `dispatch/appointments/${appointmentId}`
            : `dispatch/jobs/${jobId}`,
          body: { technicianId },
        });
      }
      try {
        const baseUrl = appointmentId
          ? client.buildUrl('dispatch', 'appointments', appointmentId)
          : client.buildUrl('dispatch', 'jobs', jobId);
        const data: any = await withRetry(
          () => client.patch(baseUrl, { technicianId }),
          3,
          'assign_technician'
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              result: data,
            }, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'assign_technician');
        return {
          content: [{
            type: 'text',
            text: `Error assigning technician: ${stError.message}`,
          }],
        };
      }
    }
  );

  logger.info('Job tools registered');
}
