import { describe, it, expect } from '@jest/globals';
import { createServer } from '../src/server.js';

describe('createServer', () => {
  it('boots without throwing and returns an MCP server instance', () => {
    const server = createServer();
    expect(server).toBeDefined();
    expect(typeof (server as any).connect).toBe('function');
  });

  it('can be invoked twice without side effects (independent instances)', () => {
    const a = createServer();
    const b = createServer();
    expect(a).not.toBe(b);
  });
});
