# AGENTS.md

This file defines repository-specific guidance for AI coding agents working in `agents-playground`.

## Project Overview

- Product: Weather Dashboard built with Next.js.
- Primary goals: city search, current conditions, 3-day forecast, favorites.
- External dependency: OpenWeatherMap API data.
- Stack: Next.js 16, React 19, TypeScript, Prisma, Vitest, MSW, Zod.

## Core Quality Requirements

- Maintain at least 80% unit/integration test coverage for generated code.
- Prefer deterministic tests with MSW mocks; avoid network-dependent tests.
- Validate external/API payloads explicitly (Zod or equivalent schema validation).
- Prioritize graceful failures with clear, user-friendly fallback behavior.

## Agent Workflow

1. Read relevant project context first (`README.md`, existing code, docs).
2. Use installed skills from `.agents/skills/` when applicable, especially:
   - `using-superpowers`
   - `brainstorming` before creative feature work
   - `test-driven-development` before implementation
   - `systematic-debugging` for failures or regressions
   - `verification-before-completion` before claiming success
3. Keep changes focused; do not revert unrelated user edits.
4. Update docs when behavior or workflow changes.

## Implementation Guidelines

- Follow existing project patterns instead of introducing parallel architectures.
- Keep components and modules small, composable, and easy to test.
- Prefer clear interfaces and strongly typed boundaries.
- Avoid over-engineering; implement only what is required for the task.
- Add concise comments only where intent is non-obvious.

## Testing and Verification

- Add or update tests alongside feature and bugfix work.
- Verify changed behavior locally before concluding work.
- If verification cannot be run, state exactly what was not run and why.

## Documentation and Logs

- Keep high-signal project docs current (`README.md` and related docs).
- When work involves meaningful AI-assisted decisions, log it under:
  - `docs/ai-interaction-logs/YYYY-MM-DD.md`

## Safety and Boundaries

- Never commit secrets, tokens, or environment credentials.
- Do not run destructive git operations unless explicitly requested.
- Do not modify unrelated files "for cleanup" without user request.

