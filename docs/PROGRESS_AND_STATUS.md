# Progress and status

Last agent pass: 2026-09-11 — added Jest contracts for `mapServiceTitanError`, `withRetry`, and `normalizePaginatedResponse`. Placeholder `expect(true)` customer tests replaced.

## Still unverified against a live ServiceTitan tenant

All CRM/dispatch/accounting/webhook tools remain structurally complete only. Do not mark Working until a sandbox smoke of each path succeeds.

## Safety

- Keep `ST_ENV=sandbox` unless Jesse explicitly flips it.
- Mutating tools (`create_job`, `update_job_status`, `assign_technician`, `register_webhook`) have no human-approval gate in this MCP. Treat them as dangerous until a confirm/dry-run wrapper exists.
- Never commit `.env` or live app keys.
