import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createClient } from '../api/client.js';
import { createToolLogger } from '../utils/logger.js';
import { mapServiceTitanError, withRetry } from '../utils/error-handler.js';

const logger = createToolLogger('webhook-tools');

const RegisterWebhookSchema = z.object({
  url: z.string().url().describe('The HTTPS URL that will receive webhook events'),
  events: z.array(z.string()).describe('List of events to subscribe to, e.g. ["job.created", "job.updated", "appointment.completed"]'),
  active: z.boolean().default(true).describe('Whether the webhook is active'),
});

export function registerWebhookTools(server: McpServer) {
  const client = createClient();

  server.tool(
    'servicetitan___register_webhook',
    'Register a new webhook endpoint with ServiceTitan. Supports events like job.created, job.updated, appointment.completed. Note: Some webhook features may require coordination with ServiceTitan support.',
    RegisterWebhookSchema.shape,
    async (params) => {
      logger.info({ params }, 'Registering webhook');
      try {
        // Webhook registration endpoint
        const url = '/webhooks/v2/register';
        const data = await withRetry(
          () => client.post(url, params),
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