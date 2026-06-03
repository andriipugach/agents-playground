---
name: mock-api-test-scaffold
description: Use when you need MSW mock handlers, a schema-validated parsing utility, and unit tests for an external JSON API (e.g. OpenWeatherMap) driven by an allowlist of inputs that succeed while everything else returns an error
---

# Mock API Test Scaffold

## Overview

Scaffold deterministic, MSW-backed tests for an external JSON API from its
response schema. You produce four artifacts: **per-input fixtures**, **allowlist
handlers**, a **pure parser**, and **unit tests** for happy path, missing fields,
and server-error responses.

**Core principle:** mock by allowlist, parse in a pure function, and never claim
done without running the suite. The allowlist (e.g. cities) returns success;
everything else returns an error.

## When to Use

- Adding/refreshing tests for any third-party API consumed via `fetch` + MSW.
- You have (or can derive) the response schema and a list of inputs that succeed.
- You need coverage for happy path, malformed payloads, and upstream failures.

Do NOT use for testing your own internal pure functions (no network = no mock).

## Inputs You Must Confirm First

1. **Endpoint URL(s)** and the query param that selects the input (e.g. `q=city`).
2. **Response schema** for success (copy a real payload shape).
3. **Allowlist** of inputs that return success (provided by the user).
4. **Error shape + status** for non-allowlisted inputs (e.g. OWM `{ cod: "404", message: "city not found" }`, status 404).

If any is missing, ask before scaffolding.

## File Layout (decide once, no agonizing)

| Artifact | Location |
|----------|----------|
| Per-input fixtures + allowlist + resolver | `tests/msw/<api>-fixtures.ts` |
| MSW handlers (allowlist-driven) | `tests/msw/handlers.ts` |
| Pure parser/normalizer (schema + map) | `lib/<api>.ts` |
| Unit tests | `tests/<api>.test.ts` |

**Decision rule (resolves the #1 baseline trap):** if a `fetch` service already
inlines the schema, EXTRACT the schema + mapping into the pure parser module and
have the service import it. Do not duplicate schemas, and do not invent a parallel
structure. One import name for the fixtures file — reuse it everywhere (a mismatched
fixtures filename is the most common scaffold bug).

## Step-by-Step

1. Build per-input fixtures keyed by the allowlist value, plus a case-insensitive,
   trimmed `resolveKey(query)` helper. Export the allowlist as a `const` array.
2. Rewrite handlers to look up the key; miss → error shape/status, hit → that
   input's fixture. Do this for EVERY endpoint, not just the first.
3. Extract a pure parser: Zod schema(s) + a `normalize(rawA, rawB)` that returns
   your domain type and throws `ZodError` on missing/malformed fields.
4. Write the three required test cases (table below) plus an allowlist-miss case.
5. Run the suite with coverage and confirm it passes BEFORE claiming done.

## Required Test Cases

| Case | How to trigger | Assert |
|------|----------------|--------|
| Happy path | call parser with a fixture (no network needed) | maps to domain type, correct values |
| Allowlisted success (e2e) | `test.each(ALLOWLIST)` through the service + MSW | resolves with success |
| Missing fields | pass a fixture with a required key deleted to the parser | throws `ZodError` |
| Server error (500) | `server.use(...)` override returning status 500 in that test | rejects with the service's fallback message |
| Allowlist miss | call service with an input not in the list | rejects with not-found message |

Test missing fields against the PURE parser, not through MSW — that is why the
parser must be standalone.

## Allowlist Handler Pattern

```typescript
// tests/msw/openweather-fixtures.ts
export const SUCCESS_CITIES = ["London", "Paris", "Tokyo"] as const;

export const currentByCity: Record<string, unknown> = {
  London: { weather: [{ description: "clear sky", icon: "01d" }], main: { temp: 22.5, humidity: 40 }, wind: { speed: 3.2 }, name: "London", sys: { country: "GB" } },
  // ...one entry per allowlisted input
};

export const resolveCity = (q: string | null) =>
  SUCCESS_CITIES.find((c) => c.toLowerCase() === q?.trim().toLowerCase());
```

```typescript
// tests/msw/handlers.ts
import { http, HttpResponse } from "msw";
import { currentByCity, resolveCity } from "@/tests/msw/openweather-fixtures";

const NOT_FOUND = { cod: "404", message: "city not found" } as const;

export const handlers = [
  http.get("https://api.openweathermap.org/data/2.5/weather", ({ request }) => {
    const key = resolveCity(new URL(request.url).searchParams.get("q"));
    if (!key) return HttpResponse.json(NOT_FOUND, { status: 404 });
    return HttpResponse.json(currentByCity[key]);
  }),
  // ...repeat for every endpoint (forecast, etc.)
];
```

## Verification (mandatory)

Run the suite and read the output before reporting success:

```bash
npm test
```

Coverage must stay at/above the repo bar (80% per AGENTS.md). If you cannot run
it, say so explicitly and state what is unverified. "Passes by construction" is
not verification.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Fixtures file created as one name, imported as another | Pick one name; reuse the exact import path everywhere |
| Schema duplicated in service and parser | Extract once into the pure parser; service imports it |
| Missing-field test routed through MSW | Call the pure parser directly with a broken fixture |
| Conflating allowlist-miss (404) with the 500 case | 404 = not in allowlist; 500 = explicit `server.use` override |
| Only first endpoint gets allowlist logic | Apply lookup to every endpoint |
| Claiming done without running tests | Run `npm test`, read output, then report |
