# agents-playground

A Weather Dashboard built with Next.js. The app lets users search for a city, view current weather conditions with a 3-day forecast, and save favorite cities. Weather data is provided via the OpenWeatherMap API.

## Local Development

1. Install dependencies:
   - `npm install`
2. Create local environment file (already ignored by git):
   - `cp .env.example .env.local`
   - Set `OPENWEATHER_API_KEY` in `.env.local`
3. Start the app:
   - `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - start local development server
- `npm run build` - production build validation
- `npm run start` - run built app
- `npm test` - run Vitest with coverage
- `npm run test:watch` - watch mode for tests

## Features

- City search against OpenWeatherMap current weather API.
- Current conditions panel with temperature, humidity, wind speed, and status.
- 3-day forecast from OpenWeatherMap forecast endpoint.
- Favorites list with add/load/remove actions.
- Graceful fallback errors for invalid city and upstream failures.

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
- `Prisma` dependencies are installed and schema is included for future DB-backed favorites; current local favorites persistence uses a JSON file at `data/favorites.json`

## Deployment and Hosting

- **Frontend/App hosting:** Vercel
- **Database hosting:** Neon (EU Central region)

## Non-Functional Requirements

- Automated unit and integration tests must provide at least **80% coverage** for generated code.
- Tests should use **MSW-based mocks** to avoid external API flakiness and ensure deterministic test behavior.
- Parsing of external data must be **reliable and explicit** (schema-driven where possible).
- Runtime behavior must prioritize **graceful failure handling**, including user-friendly error states and safe fallbacks.
