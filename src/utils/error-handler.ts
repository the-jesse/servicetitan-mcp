import { logger } from './logger.js';

export class ServiceTitanError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceTitanError';
  }
}

export function mapServiceTitanError(error: any, context: string = 'API call'): ServiceTitanError {
  const status = error.response?.status;
  const data = error.response?.data;

  let message = `ServiceTitan error during ${context}`;

  if (status === 401 || status === 403) {
    message = 'Authentication or permission error. Check credentials, scopes, and tenant access.';
  } else if (status === 404) {
    message = 'Resource not found. Verify ID or search criteria.';
  } else if (status === 429) {
    message = 'Rate limit exceeded. Please retry after some time.';
  } else if (data?.message) {
    message = data.message;
  } else if (error.message) {
    message = error.message;
  }

  logger.error({ error: data || error.message, status, context }, message);

  return new ServiceTitanError(message, status, error, data);
}

// TODO: Add retry wrapper with exponential backoff for transient errors
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  context: string = 'operation'
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries || ![500, 502, 503, 504, 429].includes(error.response?.status)) {
        throw mapServiceTitanError(error, context);
      }
      const delay = Math.pow(2, attempt) * 1000; // exponential backoff
      logger.warn({ attempt, context }, `Retrying after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}