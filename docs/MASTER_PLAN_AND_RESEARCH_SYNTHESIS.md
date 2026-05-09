# Master Plan & Research Synthesis for servicetitan-mcp

**Date**: 2026-05-09
**Status**: Scaffolding complete. Implementation ready for next phase.

## Executive Summary

This repository provides a production-grade MCP server for ServiceTitan, enabling OpenClaw agents (and other MCP-compatible AI systems) to perform sophisticated field service management tasks through natural language.

It follows senior software engineering standards: modular architecture, comprehensive documentation, semantic versioning, structured logging, security, testing readiness, and extensibility toward a multi-FSM framework.

The GitHub connector and your well-designed Jobber MCP served as key references for curation, naming, and quality bar.

## Research Performed (Summary of Sub-Agent Work)

### 1. ServiceTitan API Deep Dive
- **Authentication**: OAuth 2.0 (Client Credentials primary for server-to-server; Authorization Code for user-context). Requires Client ID/Secret + ST-App-Key header. Tenant-scoped (`/tenant/{id}/...`).
- **Base URLs**: Production `https://api.servicetitan.io`; Integration/Sandbox likely `https://api-integration.servicetitan.io` (confirm exact in portal).
- **Namespaces** (important for URL construction):
  - Dispatch / jpm: Jobs, Appointments, Projects, Assignments
  - CRM: Customers, Locations, Contacts, Leads
  - Accounting: Invoices, Payments, Pricebook
  - Settings: Technicians, Users, Shifts
- **Core Operations**: Full CRUD + search with rich filtering (status, dates, assigned tech, customer), pagination (page/pageSize or cursor), partial updates (PATCH).
- **Webhooks**: Supported (`/webhooks/v2/register`). Events like `job.created`, `job.updated`, `appointment.completed`. Ideal for real-time agent triggers.
- **Rate Limits & Pagination**: Standard REST patterns; respect headers. Export APIs for bulk.
- **Data Models**: Rich relational (Job links to Appointments, Customer, Technician, Invoice, Notes, Line Items). Confirmed via community libs (ServicePytan) and integration platforms (Prismatic, Celigo).
- **App Marketplace**: Competitive program with onboarding stages, security/reliability standards, certification path. Aim for this for distribution.

### 2. MCP & OpenClaw Ecosystem
- **SDK**: Official `@modelcontextprotocol/sdk` (TypeScript primary). `McpServer`, `.tool(name, description, schema, handler)`. Zod for schemas recommended. Stdio transport for local agents.
- **Patterns from Examples**: Clear, LLM-friendly descriptions with constraints/examples. Structured responses. Error resilience. Tool granularity balances power and simplicity (like GitHub connector's curated set).
- **OpenClaw Integration**: Via config (mcporter or direct JSON). stdio servers preferred for local. Supports multiple MCPs.
- **Jobber MCP Reference**: GraphQL-based, leverages connections for efficient relational queries. High-quality business-workflow mapping (Client/Job/Quote/Invoice/Visit). Our REST approach will use similar semantic tools + composition for relationships.

### 3. Generalization & Other FSMs
- Common entities across FSMs: Customer, Location/Property, Job/WorkOrder, Appointment/Visit, Technician/Employee, Invoice/Payment.
- Strategy: `fsm-core` shared package with interfaces + utilities. Per-app adapters handle auth differences, endpoint specifics, field mappings.
- Priority next apps: Housecall Pro, JobNimbus (strong API docs), Service Fusion.

### 4. Software Engineering Best Practices Applied
- **Architecture**: Domain-driven (api/ by namespace, tools/ by entity). Dependency injection ready. Separation of concerns (auth, client, handlers, utils).
- **Versioning**: Semantic (0.1.0 start). Keep a Changelog.
- **Documentation**: This file + README + tool-reference (auto-gen possible) + architecture.md + ADRs.
- **Observability**: Pino structured logging with redaction. Correlation for tool/API calls.
- **Security**: Env vars only, token caching/refresh with buffer, input validation (zod), HTTPS, least-privilege scopes.
- **Testing**: Jest unit + integration (sandbox). Schema validation.
- **CI/CD**: GitHub Actions planned (lint, test, build, semantic release).
- **Extensibility**: Easy to add tools or new adapters without core changes.

### 5. Verified Implementation Details
- Tool naming: `servicetitan___search_jobs`, etc. (consistent with github___ and jobber patterns).
- Response shaping: Always structured JSON + optional summary mode. Handle pagination internally or expose to agent.
- Error mapping: ServiceTitan errors -> clear, actionable messages for agent.
- Composite tools: E.g., `get_technician_schedule` may combine multiple calls or use smart endpoints.

## Detailed Project Phases

**Phase 1 (MVP - 1-2 weeks)**: Auth + 8-10 core tools (Customers, Jobs, Appointments, Technicians). Full docs. Working in OpenClaw.
**Phase 2**: Invoices, webhooks, advanced scheduling, summaries, bulk.
**Phase 3**: Framework extraction, 2nd adapter (e.g. Jobber or Housecall), full tests/CI.
**Phase 4**: Polish, Marketplace prep, v1.0.0 release.

## Next Immediate Steps (for you or coding agent)
1. Implement full auth with tenant support and refresh.
2. Build API client (axios wrapper per namespace).
3. Implement first real tools (search_customers, search_jobs) using zod schemas and error handling.
4. Expand server.ts to register all tools modularly.
5. Write unit tests.
6. Create detailed tool-reference.md.
7. Set up GitHub Actions workflow.
8. Test end-to-end with OpenClaw sandbox.

## Risks & Mitigations
- API changes: Version tools, monitor docs.
- Auth complexity: Thorough testing in sandbox.
- Rate limits: Backoff + caching in utils.
- Multi-tenancy: Design config for dynamic or per-connection.

## Resources & References
- ServiceTitan Developer Portal: https://developer.servicetitan.io
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- OpenClaw docs & examples (mcporter, config)
- Community: ServicePytan, Prismatic ServiceTitan component
- Your Jobber MCP (reference for quality)
- GitHub connector tools (reference for curation)

This synthesis ensures the implementation is factual, verified against available docs and patterns, and ready for hardened development.

---
Ready for parallel development or continuation.