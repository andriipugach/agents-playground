# agents-playground

A Weather Dashboard built with Next.js. The app lets users search for a city, view current weather conditions with a 5-day forecast, and save favorite cities. Weather data is provided via the OpenWeatherMap API.

## Local Development

1. Install dependencies:
   - `npm install`
2. Create local environment file (already ignored by git):
   - `cp .env.example .env.local`
   - Set `OPENWEATHER_API_KEY` in `.env.local`
   - Set `DATABASE_URL` to a PostgreSQL connection string, such as a Neon database URL
3. Start the app:
   - `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## API Documentation

- Swagger UI: [http://localhost:3000/docs/api](http://localhost:3000/docs/api)
- OpenAPI JSON: [http://localhost:3000/api/openapi.json](http://localhost:3000/api/openapi.json)

### Mocked weather data (offline / no API key)

Set `WEATHER_USE_MOCKS=true` in your env file to serve all weather requests from MSW mock handlers instead of the live OpenWeatherMap API. This lets you run the app without a valid `OPENWEATHER_API_KEY`. The mocks (`tests/msw/city-search-handlers.ts`) return randomized-but-deterministic weather for every other city.
Leave the flag unset or `false` to use the real API.

## Available Scripts

- `npm run dev` - start local development server
- `npm run build` - production build validation
- `npm run vercel-build` - Vercel build command; applies Prisma migrations, then builds Next.js
- `npm run start` - run built app
- `npm run lint` - run ESLint checks
- `npm run lint:fix` - run ESLint with autofixes
- `npm run typecheck` - run TypeScript without emitting files
- `npm run lint-staged` - run staged-file lint/format rules
- `npm run format` - format the repository with Prettier
- `npm run format:check` - verify Prettier formatting
- `npm run prisma:generate` - generate Prisma Client
- `npm run prisma:validate` - validate the Prisma schema
- `npm run prisma:migrate:deploy` - apply committed Prisma migrations to the configured database
- `npm run prisma:migrate:validate` - apply migrations to the configured database and report migration status
- `npm run prisma:push` - push the Prisma schema directly to the configured database
- `npm run prepare` - install Husky git hooks
- `npm test` - run Vitest with coverage
- `npm run test:watch` - watch mode for tests

## Features

- City search against OpenWeatherMap current weather API.
- Current conditions panel with temperature, humidity, wind speed, and status.
- 5-day forecast from OpenWeatherMap forecast endpoint.
- Favorites list with add/load/remove actions.
- Graceful fallback errors for invalid city and upstream failures.

## Analytics API

`POST /api/analytics` returns one public analytics metric for an explicit interval.

Example request:

```json
{
  "metric": "topLoadedCities",
  "from": "2026-06-09T00:00:00.000Z",
  "to": "2026-06-16T00:00:00.000Z",
  "limit": 5
}
```

Supported metrics are `favoritesPerDevice`, `loadedCitiesPerCountry`, `topLoadedCities`, `devicesAddedPerDay`, `topFavoritedCities`, `favoriteAddsPerDay`, and `uniqueDevicesLoadingCities`.

`limit` is required for `topLoadedCities` and `topFavoritedCities`; other metrics reject `limit`. Ranked metric limits are capped at 100, and all analytics intervals are capped at 366 days.

`favoritesPerDevice` returns deterministic response-local device labels such as `device-1` and `device-2`; it does not expose raw device cookie IDs.

## Local Analytics MCP Server

The repository includes a standalone TypeScript MCP server for querying the deployed analytics API from an AI chat client. It lives in `mcp/analytics/`, is run with `tsx`, and is not imported by the Next.js app or bundled into the application build.

The server exposes one tool:

- `get_analytics_metric` - sends `metric`, `from`, `to`, and optional `limit` to `POST /api/analytics`.

The MCP server loads the OpenAPI contract from `https://weather-dashboard-apug.vercel.app/api/openapi.json` at startup to describe the tool input schema. It does not perform local analytics validation; invalid metric rules, date ranges, or limits are sent to the HTTP API and returned to the chat client as MCP tool errors with the upstream HTTP status and response body.

Run it locally over Streamable HTTP:

```bash
npm run mcp:analytics
```

The endpoint defaults to `http://127.0.0.1:3333/mcp`. This is useful when an MCP client outside Cursor needs to connect by URL while you debug the process from Cursor.

Optional environment overrides:

```bash
ANALYTICS_OPENAPI_URL=http://localhost:3000/api/openapi.json \
ANALYTICS_API_BASE_URL=http://localhost:3000 \
npm run mcp:analytics
```

HTTP server overrides:

```bash
MCP_HOST=127.0.0.1 MCP_PORT=4444 MCP_ENDPOINT=/mcp npm run mcp:analytics
```

Debug options:

- Run `npm run mcp:analytics:debug`, attach a Node debugger to the printed inspector URL, then connect an external MCP client to `http://127.0.0.1:3333/mcp`.
- Run `npm run mcp:analytics:inspect` to open the MCP Inspector, then connect it to the local Streamable HTTP endpoint.

## Tech Stack

- `Next.js` `16`
- `React` `19`
- `Base UI` (`@base-ui/react` `1`)
- `Recharts` `3` for forecast charts
- `TypeScript` `6`
- `Prisma ORM` (`prisma` + `@prisma/client` `7`)
- `Vitest` `4` and `@vitest/coverage-v8` `4`
- `Testing Library` (`@testing-library/react` `16`, `@testing-library/jest-dom` `6`, `@testing-library/user-event` `14`)
- `MSW` (`msw` `2`) for stable API mocking in tests
- `Zod` `4` for strict schema validation and runtime-safe parsing
- Favorites are persisted through Prisma using the configured PostgreSQL database.

## Git Hooks

- Husky is configured with a `pre-commit` hook.
- The hook runs `lint-staged`, which applies ESLint + Prettier to staged files before commit.

## Deployment and Hosting

- **Frontend/App hosting:** Vercel
- **Database hosting:** Neon (EU Central region)

### Vercel Git Deployments

Deployments are managed by the Vercel Git integration:

- Pushes to `main` deploy to production.
- Pull requests create preview deployments.
- `vercel.json` sets the Vercel build command to `npm run vercel-build`, which runs `prisma migrate deploy` before `next build`.

Set production and preview runtime environment variables in the Vercel project settings:

- `OPENWEATHER_API_KEY` - OpenWeatherMap API key used by deployed app routes
- `DATABASE_URL` - PostgreSQL connection string used by Prisma for favorites
- `WEATHER_USE_MOCKS` - optional, defaults to `false` when unset

### Neon Vercel Integration

Database URLs should come from the Neon Vercel integration instead of GitHub Actions deployment secrets:

- Production deployments use the Neon `main` branch.
- Preview deployments receive isolated Neon branches.
- The injected `DATABASE_URL` is used by Prisma during `npm run vercel-build`, so migrations apply to the same Neon branch that the deployment will use at runtime.

### GitHub Actions Validation

GitHub Actions runs `.github/workflows/ci.yml` on pull requests and pushes to `main`. It validates:

- ESLint
- TypeScript
- Vitest unit/integration tests with coverage
- Next.js production build
- Prisma schema and migrations against a temporary PostgreSQL service

The workflows use Node.js `24.x`.

## Non-Functional Requirements

- Automated unit and integration tests must provide at least **80% coverage** for generated code.
- Tests should use **MSW-based mocks** to avoid external API flakiness and ensure deterministic test behavior.
- Parsing of external data must be **reliable and explicit** (schema-driven where possible).
- Runtime behavior must prioritize **graceful failure handling**, including user-friendly error states and safe fallbacks.

## UI Refresh Notes

- The dashboard UI is built with **Base UI** (`@base-ui/react`) interactive primitives (`Field`, `Button`, `Meter`, `ScrollArea`) for accessible, headless controls.
- Premium **hero + two-column dashboard** layout: search hero on top, current conditions and forecast in the main column, favorites in a sticky side panel that collapses to a single column on mobile.
- **OpenWeatherMap condition icons** are rendered for current weather and each forecast day.
- The 5-day forecast includes a **Recharts** gradient temperature-trend chart plus per-day cards, with humidity and wind shown as `Meter` bars.
- A search loading state (`isSearching`) disables the button and shows a "Searching..." label while a request is in flight.
