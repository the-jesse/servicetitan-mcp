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

const logger = createToolLogger('webhook-tools');

const RegisterWebhookSchema = z.object({
  url: z.string().url().describe('The HTTPS URL that will receive webhook events'),
  events: z.array(z.string()).describe('List of events to subscribe to, e.g. ["job.created", "job.updated", "appointment.completed"]'),
  active: z.boolean().default(true).describe('Whether the webhook is active'),
  ...WriteGateFields,
});

export function registerWebhookTools(server: McpServer) {
  const client = createClient();

  server.tool(
    'servicetitan___register_webhook',
    'GATED WRITE. Register a webhook. Defaults to dryRun=true. Live write requires dryRun=false, confirm=true, and ST_ENV=sandbox or ST_ALLOW_LIVE_WRITES=1. Endpoint unverified; may need ServiceTitan support.',
    RegisterWebhookSchema.shape,
    async (params) => {
      logger.info({ params }, 'Registering webhook');
      const decision = evaluateWriteGate(params);
      const body = stripGateFields(params);
      if (!decision.allowed) {
        return gatedResponse('servicetitan___register_webhook', decision, {
          method: 'POST',
          pathHint: '/webhooks/v2/register',
          body,
        });
      }
      try {
        const url = '/webhooks/v2/register';
        const data = await withRetry(
          () => client.post(url, body),
          3,
          'register_webhook'
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              webhook: data,
              note: 'Verify the webhook is working by checking your endpoint logs.',
            }, null, 2),
          }],
        };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'register_webhook');
        return {
          content: [{
            type: 'text',
            text: `Error registering webhook: ${stError.message}. You may need to contact integrations@servicetitan.com for webhook enablement.`,
          }],
        };
      }
    }
  );

  server.tool(
    'servicetitan___list_webhooks',
    'List currently registered webhooks for the tenant.',
    {},
    async () => {
      logger.info('Listing webhooks');
      try {
        const url = '/webhooks/v2';
        const data = await withRetry(() => client.get(url), 3, 'list_webhooks');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'list_webhooks');
        return { content: [{ type: 'text', text: `Error: ${stError.message}` }] };
      }
    }
  );

  logger.info('Webhook tools registered');
}
