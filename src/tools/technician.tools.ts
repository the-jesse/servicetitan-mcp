import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClient } from '../api/client.js';
import { createToolLogger } from '../utils/logger.js';
import { mapServiceTitanError, withRetry } from '../utils/error-handler.js';

const logger = createToolLogger('technician-tools');

const ListTechniciansSchema = z.object({
  status: z.string().optional().describe('Filter by technician status (e.g., Active, Inactive)'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

const GetTechnicianSchema = z.object({
  technicianId: z.string().or(z.number()).describe('The unique ID of the technician'),
});

const GetAvailabilitySchema = z.object({
  technicianId: z.string().or(z.number()).describe('The unique ID of the technician'),
  dateFrom: z.string().describe('Start of window to check availability (YYYY-MM-DD)'),
  dateTo: z.string().describe('End of window to check availability (YYYY-MM-DD)'),
});

const FindAvailableTechniciansSchema = z.object({
  dateFrom: z.string().describe('Start of window to find available technicians (YYYY-MM-DD)'),
  dateTo: z.string().describe('End of window to find available technicians (YYYY-MM-DD)'),
  skills: z.array(z.string()).optional().describe('Filter to technicians with these skills/certifications'),
  limit: z.number().int().min(1).max(50).default(10).describe('Maximum number of available technicians to return'),
});

async function fetchAvailability(
  client: ReturnType<typeof createClient>,
  technicianId: string | number,
  dateFrom: string,
  dateTo: string
): Promise<any> {
  const url = client.buildUrl('dispatch', `technicians/${technicianId}/availability`);
  return client.get<any>(url, { params: { dateFrom, dateTo } });
}

function hasFreeSlot(availability: any): boolean {
  if (!availability) return false;
  if (Array.isArray(availability.slots)) return availability.slots.some((s: any) => s.available !== false);
  if (typeof availability.available === 'boolean') return availability.available;
  return true;
}

export function registerTechnicianTools(server: McpServer) {
  const client = createClient();

  server.tool(
    'servicetitan___list_technicians',
    'List technicians with optional filters (status, skills, location). Useful for dispatching and availability checks.',
    ListTechniciansSchema.shape,
    async (params) => {
      logger.info({ params }, 'Listing technicians');
      try {
        const url = client.buildUrl('settings', 'technicians');
        const data = await withRetry(() => client.get<any>(url, { params }), 3, 'list_technicians');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'list_technicians');
        return { content: [{ type: 'text', text: `Error: ${stError.message}` }] };
      }
    }
  );

  server.tool(
    'servicetitan___get_technician',
    'Retrieve full details for a specific technician by ID (name, contact, skills, status).',
    GetTechnicianSchema.shape,
    async (params) => {
      const { technicianId } = params;
      logger.info({ technicianId }, 'Getting technician');
      try {
        const url = client.buildUrl('settings', 'technicians', technicianId);
        const data = await withRetry(() => client.get<any>(url), 3, 'get_technician');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'get_technician');
        return { content: [{ type: 'text', text: `Error getting technician: ${stError.message}` }] };
      }
    }
  );

  server.tool(
    'servicetitan___get_availability',
    "Check a single technician's availability across a date window. Returns the technician's schedule blocks and free slots.",
    GetAvailabilitySchema.shape,
    async (params) => {
      const { technicianId, dateFrom, dateTo } = params;
      logger.info({ technicianId, dateFrom, dateTo }, 'Getting availability');
      try {
        const data = await withRetry(
          () => fetchAvailability(client, technicianId, dateFrom, dateTo),
          3,
          'get_availability'
        );
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'get_availability');
        return { content: [{ type: 'text', text: `Error getting availability: ${stError.message}` }] };
      }
    }
  );

  server.tool(
    'servicetitan___find_available_technicians',
    'Composite tool: list active technicians, check each one\'s availability in the given window, and return those with at least one free slot. Optionally filter by required skills. Use this for "who can take this job?" workflows.',
    FindAvailableTechniciansSchema.shape,
    async (params) => {
      const { dateFrom, dateTo, skills, limit } = params;
      logger.info({ dateFrom, dateTo, skills, limit }, 'Finding available technicians');
      try {
        const listUrl = client.buildUrl('settings', 'technicians');
        const listing = await withRetry(
          () => client.get<any>(listUrl, { params: { status: 'Active', pageSize: 50 } }),
          3,
          'find_available_technicians:list'
        );
        const candidates: any[] = listing.technicians || listing.items || listing.data || listing || [];

        const filtered = skills && skills.length
          ? candidates.filter((t) => {
              const techSkills: string[] = t.skills || t.certifications || [];
              return skills.every((s) => techSkills.includes(s));
            })
          : candidates;

        // Fan out availability lookups in chunks of 10 to avoid bursting rate limits
        const CHUNK = 10;
        const available: any[] = [];
        for (let i = 0; i < filtered.length && available.length < limit; i += CHUNK) {
          const slice = filtered.slice(i, i + CHUNK);
          const results = await Promise.all(
            slice.map(async (t) => {
              try {
                const availability = await withRetry(
                  () => fetchAvailability(client, t.id, dateFrom, dateTo),
                  3,
                  'find_available_technicians:availability'
                );
                return hasFreeSlot(availability) ? { technician: t, availability } : null;
              } catch (err: any) {
                logger.warn({ technicianId: t.id, err: err?.message }, 'availability lookup failed; skipping');
                return null;
              }
            })
          );
          for (const r of results) {
            if (r && available.length < limit) available.push(r);
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              dateFrom,
              dateTo,
              skillsFilter: skills || [],
              total: available.length,
              technicians: available,
            }, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'find_available_technicians');
        return { content: [{ type: 'text', text: `Error finding available technicians: ${stError.message}` }] };
      }
    }
  );

  logger.info('Technician tools registered');
}
