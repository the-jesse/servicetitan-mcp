import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { mapServiceTitanError, withRetry, ServiceTitanError } from '../../src/utils/error-handler.js';

function httpError(status: number, data?: any, message = 'boom') {
  const err: any = new Error(message);
  err.response = { status, data };
  return err;
}

describe('mapServiceTitanError', () => {
  it('maps 401/403 to an auth message and preserves status', () => {
    const mapped = mapServiceTitanError(httpError(401), 'get_customer');
    expect(mapped).toBeInstanceOf(ServiceTitanError);
    expect(mapped.statusCode).toBe(401);
    expect(mapped.message).toMatch(/Authentication or permission/);
  });

  it('maps 404 to a not-found message', () => {
    const mapped = mapServiceTitanError(httpError(404), 'get_job');
    expect(mapped.statusCode).toBe(404);
    expect(mapped.message).toMatch(/not found/i);
  });

  it('maps 429 to a rate-limit message', () => {
    const mapped = mapServiceTitanError(httpError(429), 'search_jobs');
    expect(mapped.statusCode).toBe(429);
    expect(mapped.message).toMatch(/Rate limit/);
  });

  it('prefers vendor data.message for other statuses', () => {
    const mapped = mapServiceTitanError(httpError(422, { message: 'Invalid customer id' }), 'update');
    expect(mapped.message).toBe('Invalid customer id');
    expect(mapped.statusCode).toBe(422);
  });

  it('falls back to Error.message when there is no HTTP envelope', () => {
    const mapped = mapServiceTitanError(new Error('network down'), 'ping');
    expect(mapped.message).toBe('network down');
    expect(mapped.statusCode).toBeUndefined();
  });
});

describe('withRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns on first success without retrying', async () => {
    const fn = jest.fn(async () => 42);
    await expect(withRetry(fn, 3, 'ok')).resolves.toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry 404', async () => {
    const fn = jest.fn(async () => {
      throw httpError(404);
    });
    await expect(withRetry(fn, 3, 'missing')).rejects.toMatchObject({
      name: 'ServiceTitanError',
      statusCode: 404,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries 503 then succeeds', async () => {
    const fn = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValueOnce('recovered');

    const pending = withRetry(fn, 3, 'flaky');
    await jest.advanceTimersByTimeAsync(2000);
    await expect(pending).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('maps the last 500 after exhausting retries', async () => {
    const fn = jest.fn(async () => {
      throw httpError(500, { message: 'upstream' });
    });
    const pending = withRetry(fn, 2, 'down');
    const assertion = expect(pending).rejects.toMatchObject({
      name: 'ServiceTitanError',
      statusCode: 500,
    });
    await jest.advanceTimersByTimeAsync(2000);
    await assertion;
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
