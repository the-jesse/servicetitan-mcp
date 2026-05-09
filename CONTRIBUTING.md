# Contributing to servicetitan-mcp

Thank you for your interest in contributing!

## Development Setup

1. Clone the repo
2. `npm install`
3. Copy `.env.example` to `.env` and add your ServiceTitan sandbox credentials
4. `npm run build`

## Adding a New Tool

1. Create or update a file in `src/tools/<domain>.tools.ts` (e.g. `technician.tools.ts`)
2. Use the established pattern:
   - Zod schema for input
   - `createClient()` from `../api/client.js`
   - `withRetry()` + `mapServiceTitanError()`
   - `createToolLogger()`
   - Clear, LLM-friendly description
3. Export a `register<Domain>Tools(server)` function
4. Register it in `src/server.ts`

## Code Style

- TypeScript strict mode
- Zod for all tool schemas
- Structured logging
- Comprehensive error handling
- Small, focused commits

## Testing

- Add tests in `tests/`
- Run `npm test`

## Documentation

Update `docs/TOOL_REFERENCE.md` when adding tools.
Update this file or README for major changes.

## Pull Requests

- Keep PRs focused
- Include tests where possible
- Update documentation

Questions? Open an issue.