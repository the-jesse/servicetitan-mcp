# servicetitan-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that lets any MCP-compatible AI agent — Claude Desktop, OpenClaw, or your own agent built on the Anthropic SDK — talk to [ServiceTitan](https://www.servicetitan.com/), the field-service management platform used by HVAC, plumbing, electrical, and other home-services businesses.

The idea: **bring your own ServiceTitan account, plug this connector into your agent, and your agent can now search customers, look up jobs, manage appointments, query technicians, pull invoices, and register webhooks via natural language.**

> **Status: Alpha.** The architecture, auth, error handling, and tool surface are in place. API endpoint paths and response shapes are based on common ServiceTitan patterns and **need verification against a live sandbox** before relying on any individual call. Contributions and bug reports from people with sandbox access are very welcome.

## Why this exists

Every ServiceTitan-based business will eventually want their own custom AI workflows on top of their data. Rather than re-building the integration layer each time, this MCP server is meant to be a **shared, reusable connector**: anyone can drop it into their agent stack, authenticate with their own credentials, and get a consistent set of FSM tools without writing API plumbing.

## Tools

All tools are namespaced `servicetitan___<verb>_<noun>` so MCP clients group them cleanly.

| Tool | Domain | Status |
| --- | --- | --- |
| `servicetitan___ping` | meta | Working — no API call |
| `servicetitan___search_customers` | CRM | Structurally complete, endpoint unverified |
| `servicetitan___get_customer` | CRM | Structurally complete, endpoint unverified |
| `servicetitan___create_customer` | CRM | Structurally complete, endpoint unverified |
| `servicetitan___update_customer` | CRM | Structurally complete, endpoint unverified |
| `servicetitan___search_jobs` | dispatch | Structurally complete, endpoint unverified |
| `servicetitan___get_job` | dispatch | Structurally complete, endpoint unverified |
| `servicetitan___create_job` | dispatch | Structurally complete, endpoint unverified |
| `servicetitan___update_job_status` | dispatch | Structurally complete, endpoint unverified |
| `servicetitan___assign_technician` | dispatch | Structurally complete, endpoint unverified |
| `servicetitan___search_appointments` | dispatch | Structurally complete, endpoint unverified |
| `servicetitan___get_appointment` | dispatch | Structurally complete, endpoint unverified |
| `servicetitan___create_appointment` | dispatch | Structurally complete, endpoint unverified |
| `servicetitan___reschedule_appointment` | dispatch | Structurally complete, endpoint unverified |
| `servicetitan___list_technicians` | settings | Structurally complete, endpoint unverified |
| `servicetitan___get_technician` | settings | Structurally complete, endpoint unverified |
| `servicetitan___get_availability` | dispatch | Structurally complete, endpoint unverified |
| `servicetitan___find_available_technicians` | composite | Structurally complete, endpoint unverified |
| `servicetitan___search_invoices` | accounting | Structurally complete, endpoint unverified |
| `servicetitan___get_invoice` | accounting | Structurally complete, endpoint unverified |
| `servicetitan___create_invoice_from_job` | accounting | Structurally complete, endpoint unverified |
| `servicetitan___record_payment` | accounting | Structurally complete, endpoint unverified |
| `servicetitan___register_webhook` | webhooks | Structurally complete, endpoint unverified |
| `servicetitan___list_webhooks` | webhooks | Structurally complete, endpoint unverified |

"Structurally complete" means: full Zod schema, retry/backoff, error mapping, and logging — but the URL path and response field names are based on ServiceTitan's documented patterns and have not yet been exercised against a real tenant. Once verified, these will be marked Working.

See [`docs/TOOL_REFERENCE.md`](docs/TOOL_REFERENCE.md) for parameter detail.

## Install

Requires Node.js ≥ 20.

```bash
git clone https://github.com/the-jesse/servicetitan-mcp.git
cd servicetitan-mcp
npm install
cp .env.example .env   # then fill in your ServiceTitan credentials
npm run build
```

### Required environment variables

| Variable | Description |
| --- | --- |
| `ST_CLIENT_ID` | OAuth client ID from the ServiceTitan developer portal |
| `ST_CLIENT_SECRET` | OAuth client secret |
| `ST_APP_KEY` | App key (sent as the `ST-App-Key` header) |
| `ST_TENANT_ID` | Your ServiceTitan tenant ID |
| `ST_ENV` | `sandbox` (default) or `production` |
| `LOG_LEVEL` | Optional: `debug` / `info` / `warn` / `error` |

## Use it with an MCP client

### Claude Desktop

Add this to `claude_desktop_config.json` (path varies by OS — see Anthropic's docs):

```json
{
  "mcpServers": {
    "servicetitan": {
      "command": "node",
      "args": ["/absolute/path/to/servicetitan-mcp/dist/index.js"],
      "env": {
        "ST_CLIENT_ID": "...",
        "ST_CLIENT_SECRET": "...",
        "ST_APP_KEY": "...",
        "ST_TENANT_ID": "...",
        "ST_ENV": "sandbox"
      }
    }
  }
}
```

### Any other MCP client

The server speaks MCP over stdio. Run `node dist/index.js` (or `npm run dev` for live TS) and point your client at the resulting process.

## Development

```bash
npm run dev            # run server from TS via tsx
npm run build          # compile to dist/
npm run lint           # eslint over src/
npm test               # jest
npm run test:watch     # jest in watch mode
```

Run a single test: `npx jest tests/tools/customer.test.ts` or `npx jest -t "name"`.

See [`CLAUDE.md`](CLAUDE.md) for architecture details and the standard tool-implementation template, and [`CONTRIBUTING.md`](CONTRIBUTING.md) for how to add new tools.

## License

MIT — see [`LICENSE`](LICENSE).
