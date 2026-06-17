# Swagger REST API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Swagger/OpenAPI documentation for the implemented REST APIs.

**Architecture:** Create one canonical OpenAPI 3.1 document in `lib/openapi.ts`, expose it with `GET /api/openapi.json`, and render it from an in-app Swagger UI page. Tests assert the spec includes every current route and important operation metadata.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, Swagger UI CDN assets.

---

## File Structure

- Create `lib/openapi.ts`: exports the OpenAPI document and reusable schema objects.
- Create `app/api/openapi.json/route.ts`: returns the shared document as JSON.
- Create `app/docs/api/page.tsx`: renders the Swagger UI page from pinned CDN assets.
- Modify `README.md`: documents `/docs/api` and `/api/openapi.json`.
- Create `tests/openapi-route.test.ts`: route and document coverage tests.
- Modify `package-lock.json`: keep lockfile consistent after dependency evaluation.

### Task 1: OpenAPI Route Test

**Files:**

- Create: `tests/openapi-route.test.ts`
- Later create: `lib/openapi.ts`
- Later create: `app/api/openapi.json/route.ts`

- [ ] **Step 1: Write the failing route/spec test**

```ts
import { describe, expect, test } from "vitest";
import { GET } from "@/app/api/openapi.json/route";
import { openApiDocument } from "@/lib/openapi";

describe("openapi route", () => {
  test("returns the shared OpenAPI document", async () => {
    const response = await GET();

    await expect(response.json()).resolves.toEqual(openApiDocument);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  test("documents every implemented REST API path", () => {
    expect(Object.keys(openApiDocument.paths)).toEqual([
      "/api/analytics",
      "/api/favorites",
      "/api/favorites/{id}",
      "/api/weather",
      "/api/weather/location",
    ]);
  });

  test("documents operation methods, parameters, request bodies, and responses", () => {
    expect(openApiDocument.paths["/api/weather"]?.get?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "city", in: "query", required: true }),
      ]),
    );
    expect(openApiDocument.paths["/api/weather"]?.get?.responses).toHaveProperty("200");
    expect(openApiDocument.paths["/api/weather"]?.get?.responses).toHaveProperty("400");
    expect(openApiDocument.paths["/api/weather"]?.get?.responses).toHaveProperty("404");

    expect(openApiDocument.paths["/api/favorites"]?.get?.responses).toHaveProperty("200");
    expect(openApiDocument.paths["/api/favorites"]?.post?.requestBody).toBeDefined();
    expect(openApiDocument.paths["/api/favorites"]?.post?.responses).toHaveProperty("201");

    expect(openApiDocument.paths["/api/favorites/{id}"]?.delete?.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "id", in: "path", required: true })]),
    );
    expect(openApiDocument.paths["/api/favorites/{id}"]?.delete?.responses).toHaveProperty("204");

    expect(openApiDocument.paths["/api/analytics"]?.post?.requestBody).toBeDefined();
    expect(openApiDocument.paths["/api/analytics"]?.post?.responses).toHaveProperty("200");
    expect(openApiDocument.paths["/api/analytics"]?.post?.responses).toHaveProperty("400");
    expect(openApiDocument.paths["/api/analytics"]?.post?.responses).toHaveProperty("500");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/openapi-route.test.ts`

Expected: FAIL because `@/app/api/openapi.json/route` and `@/lib/openapi` do not exist yet.

- [ ] **Step 3: Implement the OpenAPI document**

Create `lib/openapi.ts` with:

```ts
export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Weather Dashboard REST API",
    version: "0.0.1",
    description:
      "REST API documentation for weather search, location weather, favorites, and analytics.",
  },
  paths: {
    "/api/analytics": {
      post: {
        summary: "Load an analytics metric",
        tags: ["Analytics"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AnalyticsRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Analytics metric response",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnalyticsResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": {
            description: "Unexpected analytics loading failure",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/favorites": {
      get: {
        summary: "List favorite cities for the current device",
        tags: ["Favorites"],
        responses: {
          "200": {
            description: "Favorite cities",
            headers: {
              "Set-Cookie": {
                description: "Sets a deviceId cookie when one is missing.",
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/FavoriteCity" },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Add a city to favorites for the current device",
        tags: ["Favorites"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateFavoriteRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Created favorite city",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FavoriteCity" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/api/favorites/{id}": {
      delete: {
        summary: "Remove a favorite city for the current device",
        tags: ["Favorites"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "204": { description: "Favorite removed" },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/api/weather": {
      get: {
        summary: "Load weather by city name",
        tags: ["Weather"],
        parameters: [
          {
            name: "city",
            in: "query",
            required: true,
            schema: { type: "string", minLength: 1 },
          },
        ],
        responses: {
          "200": {
            description: "Weather snapshot",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WeatherSnapshot" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/weather/location": {
      get: {
        summary: "Load weather by coordinates",
        tags: ["Weather"],
        parameters: [
          {
            name: "lat",
            in: "query",
            required: true,
            schema: { type: "number", minimum: -90, maximum: 90 },
          },
          {
            name: "lon",
            in: "query",
            required: true,
            schema: { type: "number", minimum: -180, maximum: 180 },
          },
        ],
        responses: {
          "200": {
            description: "Weather snapshot",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WeatherSnapshot" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
  components: {
    responses: {
      BadRequest: {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFound: {
        description: "Requested city was not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
    schemas: {
      AnalyticsRequest: {
        type: "object",
        required: ["metric", "from", "to"],
        additionalProperties: false,
        properties: {
          metric: {
            type: "string",
            enum: [
              "favoritesPerDevice",
              "loadedCitiesPerCountry",
              "topLoadedCities",
              "devicesAddedPerDay",
              "topFavoritedCities",
              "favoriteAddsPerDay",
              "uniqueDevicesLoadingCities",
            ],
          },
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
          limit: { type: "integer", minimum: 1, maximum: 100 },
        },
      },
      AnalyticsResponse: {
        oneOf: [
          { $ref: "#/components/schemas/CountByDeviceMetricResponse" },
          { $ref: "#/components/schemas/CountByCountryMetricResponse" },
          { $ref: "#/components/schemas/CountByCityMetricResponse" },
          { $ref: "#/components/schemas/CountByDayMetricResponse" },
          { $ref: "#/components/schemas/UniqueCountMetricResponse" },
        ],
      },
      CountByDeviceMetricResponse: {
        type: "object",
        required: ["metric", "from", "to", "data"],
        properties: {
          metric: { const: "favoritesPerDevice" },
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
          data: {
            type: "array",
            items: {
              type: "object",
              required: ["device", "count"],
              properties: {
                device: { type: "string", examples: ["device-1"] },
                count: { type: "integer" },
              },
            },
          },
        },
      },
      CountByCountryMetricResponse: {
        type: "object",
        required: ["metric", "from", "to", "data"],
        properties: {
          metric: { const: "loadedCitiesPerCountry" },
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
          data: {
            type: "array",
            items: {
              type: "object",
              required: ["country", "count"],
              properties: {
                country: { type: "string", examples: ["UA"] },
                count: { type: "integer" },
              },
            },
          },
        },
      },
      CountByCityMetricResponse: {
        type: "object",
        required: ["metric", "from", "to", "data"],
        properties: {
          metric: { enum: ["topLoadedCities", "topFavoritedCities"] },
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
          data: {
            type: "array",
            items: {
              type: "object",
              required: ["city", "count"],
              properties: {
                city: { type: "string", examples: ["Kyiv"] },
                count: { type: "integer" },
              },
            },
          },
        },
      },
      CountByDayMetricResponse: {
        type: "object",
        required: ["metric", "from", "to", "data"],
        properties: {
          metric: { enum: ["devicesAddedPerDay", "favoriteAddsPerDay"] },
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
          data: {
            type: "array",
            items: {
              type: "object",
              required: ["date", "count"],
              properties: {
                date: { type: "string", format: "date" },
                count: { type: "integer" },
              },
            },
          },
        },
      },
      UniqueCountMetricResponse: {
        type: "object",
        required: ["metric", "from", "to", "data"],
        properties: {
          metric: { const: "uniqueDevicesLoadingCities" },
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
          data: {
            type: "object",
            required: ["count"],
            properties: { count: { type: "integer" } },
          },
        },
      },
      CreateFavoriteRequest: {
        type: "object",
        required: ["city"],
        additionalProperties: false,
        properties: {
          city: { type: "string", minLength: 1, examples: ["Kyiv"] },
        },
      },
      FavoriteCity: {
        type: "object",
        required: ["id", "city", "createdAt"],
        properties: {
          id: { type: "integer", examples: [1] },
          city: { type: "string", examples: ["Kyiv"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      WeatherForecastDay: {
        type: "object",
        required: ["date", "temperatureC", "description", "iconUrl"],
        properties: {
          date: { type: "string", examples: ["2026-06-16"] },
          temperatureC: { type: "number" },
          description: { type: "string", examples: ["clear sky"] },
          iconUrl: { type: "string", format: "uri" },
        },
      },
      WeatherSnapshot: {
        type: "object",
        required: ["city", "country", "current", "forecast"],
        properties: {
          city: { type: "string", examples: ["Kyiv"] },
          country: { type: "string", examples: ["UA"] },
          current: {
            type: "object",
            required: ["temperatureC", "description", "humidity", "windSpeed", "iconUrl"],
            properties: {
              temperatureC: { type: "number" },
              description: { type: "string" },
              humidity: { type: "integer" },
              windSpeed: { type: "number" },
              iconUrl: { type: "string", format: "uri" },
            },
          },
          forecast: {
            type: "array",
            items: { $ref: "#/components/schemas/WeatherForecastDay" },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string" },
        },
      },
    },
  },
} as const;
```

- [ ] **Step 4: Implement the JSON route**

Create `app/api/openapi.json/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { openApiDocument } from "@/lib/openapi";

export const GET = () => NextResponse.json(openApiDocument);
```

- [ ] **Step 5: Run the route/spec test to verify it passes**

Run: `npm test -- tests/openapi-route.test.ts`

Expected: PASS for all tests in `tests/openapi-route.test.ts`.

### Task 2: Swagger UI Page

**Files:**

- Modify: `package-lock.json`
- Create: `app/docs/api/page.tsx`

- [ ] **Step 1: Add the Swagger UI page**

Create `app/docs/api/page.tsx` with:

```tsx
import Script from "next/script";

const swaggerUiVersion = "5.32.6";
const swaggerUiBaseUrl = `https://unpkg.com/swagger-ui-dist@${swaggerUiVersion}`;

const ApiDocsPage = () => (
  <>
    <link rel="stylesheet" href={`${swaggerUiBaseUrl}/swagger-ui.css`} />
    <main id="swagger-ui" />
    <Script src={`${swaggerUiBaseUrl}/swagger-ui-bundle.js`} strategy="afterInteractive" />
    <Script id="swagger-ui-init" strategy="afterInteractive">
      {`window.SwaggerUIBundle({ url: "/api/openapi.json", dom_id: "#swagger-ui" });`}
    </Script>
  </>
);

export default ApiDocsPage;
```

- [ ] **Step 2: Run TypeScript to catch integration issues**

Run: `npm run typecheck`

Expected: PASS with no TypeScript errors.

### Task 3: README Documentation

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Update README docs section**

Add this section after the local development instructions:

```md
## API Documentation

- Swagger UI: [http://localhost:3000/docs/api](http://localhost:3000/docs/api)
- OpenAPI JSON: [http://localhost:3000/api/openapi.json](http://localhost:3000/api/openapi.json)
```

- [ ] **Step 2: Run formatting check**

Run: `npm run format:check`

Expected: PASS or only reports files changed by this plan; if changed files need formatting, run `npm run format -- README.md docs/superpowers/plans/2026-06-16-swagger-rest-api.md docs/superpowers/specs/2026-06-16-swagger-rest-api-design.md`.

### Task 4: Final Verification

**Files:**

- All files changed by the plan.

- [ ] **Step 1: Run focused test**

Run: `npm test -- tests/openapi-route.test.ts`

Expected: PASS.

- [ ] **Step 2: Run linter**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 4: Run full test suite**

Run: `npm test`

Expected: PASS with coverage thresholds met.

- [ ] **Step 5: Run production build**

Run: `npm run build`

Expected: PASS.
