# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run build` — TypeScript compile to `dist/` (uses `tsc`, ESM output).
- `npm run dev` — Run the server directly from TS via `tsx src/index.ts`.
- `npm start` — Run the built server (`node dist/index.js`); requires `npm run build` first.
- `npm run lint` — ESLint over `src/**/*.ts`.
- `npm test` — Jest (`ts-jest` ESM preset). Tests live in `tests/**/*.test.ts`.
- `npm run test:watch` — Jest in watch mode.
- Run a single test file: `npx jest tests/tools/customer.test.ts`.
- Run a single test by name: `npx jest -t "should handle pagination"`.
- Local setup requires `.env` (copy from `.env.example`) with `ST_CLIENT_ID`, `ST_CLIENT_SECRET`, `ST_APP_KEY`, `ST_TENANT_ID`, and `ST_ENV` (`sandbox` or `production`).

## Architecture

This is a **Model Context Protocol (MCP) server** that exposes ServiceTitan FSM operations as tools to LLM agents over stdio. It is consumed by OpenClaw / any MCP client.

**Process shape**: `src/index.ts` boots an `McpServer` (from `@modelcontextprotocol/sdk`) over `StdioServerTransport`. All logs go to `stderr` because `stdout` is the MCP transport — never `console.log` to stdout in this codebase.

**Layered design** (each layer depends only on layers below it):

1. `src/auth/oauth.ts` — OAuth2 client-credentials flow against ServiceTitan's `/auth/connect/token`. Caches the access token in module state with a 60s expiry buffer; `clearTokenCache()` forces re-auth. Base URL flips between `api.servicetitan.io` (production) and `api-integration.servicetitan.io` (sandbox) based on `ST_ENV`.
2. `src/api/client.ts` — `ServiceTitanClient` wraps axios. The request interceptor injects `Authorization: Bearer <token>` and the `ST-App-Key` header on every call. `buildUrl(namespace, resource, id?)` constructs tenant-scoped paths in the form `/{namespace}/v2/tenant/{tenantId}/{resource}` — most ServiceTitan endpoints follow this pattern, with `namespace` being `crm`, `dispatch`, `accounting`, `settings`, etc. Always go through `createClient()` rather than instantiating axios directly.
3. `src/utils/` — Cross-cutting helpers used by every tool:
   - `logger.ts`: pino logger with secret redaction (credentials, tokens, Authorization headers). Use `createToolLogger('<tool-name>')` per tool module.
   - `error-handler.ts`: `mapServiceTitanError(err, context)` translates axios errors into a `ServiceTitanError` with a human-readable message (handles 401/403/404/429 specially). `withRetry(fn, maxRetries, context)` retries on 5xx/429 with exponential backoff (`2^attempt * 1000` ms) and maps the final error.
   - `pagination.ts`: `PaginationSchema` and `CommonFiltersSchema` are spread into Zod schemas; `normalizePaginatedResponse` smooths over ServiceTitan's inconsistent response shapes.
4. `src/tools/<domain>.tools.ts` — One file per ServiceTitan domain (customer, job, appointment, technician, invoice, webhook). Each exports `register<Domain>Tools(server: McpServer)`.
5. `src/server.ts` — `createServer()` constructs the `McpServer` and registers tools. **Important: the domain tool files exist but are not yet wired into `server.ts`** — only the `servicetitan___ping` placeholder is currently registered. When implementing new functionality, add the `register<Domain>Tools(server)` call here.

**Tool naming**: All MCP tools use the `servicetitan___<verb>_<noun>` triple-underscore prefix (e.g. `servicetitan___search_customers`). Preserve this convention so OpenClaw groups them correctly.

**Standard tool shape** — every domain tool follows this template; mirror it when adding tools:

```ts
const Schema = z.object({ /* Zod fields with .describe() for LLM guidance */ });

export function registerXTools(server: McpServer) {
  const client = createClient();
  server.tool(
    'servicetitan___verb_noun',
    'LLM-facing description explaining when to use the tool.',
    Schema.shape,                                  // pass .shape, not the schema
    async (params) => {
      logger.info({ params }, '...');
      try {
        const url = client.buildUrl('namespace', 'resource');
        const data = await withRetry(() => client.get(url, { params }), 3, 'verb_noun');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (error: any) {
        const stError = mapServiceTitanError(error, 'verb_noun');
        return { content: [{ type: 'text', text: `Error: ${stError.message}` }] };
      }
    },
  );
}
```

Tool responses must always be `{ content: [{ type: 'text', text: ... }] }` — return errors as text content (do not throw out of the handler), so the agent can surface them.

## Conventions

- **ESM + NodeNext**: `tsconfig` is `"module": "NodeNext"` and `package.json` has `"type": "module"`. Relative imports inside `src/` must end in `.js` (e.g. `import { createClient } from '../api/client.js'`) even though the source files are `.ts`. Jest uses `ts-jest`'s ESM preset with a `moduleNameMapper` that strips the `.js` for tests.
- **Zod for every tool input**: schemas double as runtime validation and as the description the LLM sees. Always include `.describe()` on each field.
- **Always wrap API calls in `withRetry` + `mapServiceTitanError`**: never call `client.get/post` directly inside a tool handler without these.
- **Tenant ID** is read from `ST_TENANT_ID` by default but can be overridden by passing it to `createClient(tenantId)`. The client warns (does not throw) if it's missing.
- **API endpoint paths and response shapes are not authoritative** in this codebase — many are placeholder/example URLs (noted in inline comments). When implementing new tools, verify against the ServiceTitan developer portal; existing `buildUrl` namespace choices (`crm`, `dispatch`, `accounting`, `settings`) are starting guesses.
- **Adding a tool** (per `CONTRIBUTING.md`): create/edit `src/tools/<domain>.tools.ts`, follow the standard shape above, register in `src/server.ts`, and update `docs/TOOL_REFERENCE.md`.
