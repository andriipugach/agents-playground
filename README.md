# agents-playground

A Weather Dashboard built with Next.js. The app lets users search for a city, view current weather conditions with a 3-day forecast, and save favorite cities. Weather data is provided via the OpenWeatherMap API.

## Tech Stack

- `Next.js` `16`
- `React` `19`
- `Base UI` (`@base-ui/react` `1`)
- `TypeScript` `6`
- `Prisma ORM` (`prisma` + `@prisma/client` `7`)
- `Vitest` `4` and `@vitest/coverage-v8` `4`
- `Testing Library` (`@testing-library/react` `16`, `@testing-library/jest-dom` `6`, `@testing-library/user-event` `14`)
- `MSW` (`msw` `2`) for stable API mocking in tests
- `Zod` `4` for strict schema validation and runtime-safe parsing
- `ESLint` `10`, `eslint-config-next` `16`, and `Prettier` `3`

## Deployment and Hosting

- **Frontend/App hosting:** Vercel
- **Database hosting:** Neon (EU Central region)

## Non-Functional Requirements

- Automated unit and integration tests must provide at least **80% coverage** for generated code.
- Tests should use **MSW-based mocks** to avoid external API flakiness and ensure deterministic test behavior.
- Parsing of external data must be **reliable and explicit** (schema-driven where possible).
- Runtime behavior must prioritize **graceful failure handling**, including user-friendly error states and safe fallbacks.
