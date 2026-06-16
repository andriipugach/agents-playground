# Analytics API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public `POST /api/analytics` endpoint that accepts a unified metric request and returns one requested analytics insight for the provided interval.

**Architecture:** Add a route handler that parses JSON, validates it with a Zod-backed analytics service, and delegates metric aggregation to a Prisma repository. Keep request validation, metric dispatch, and Prisma query details in focused modules so tests can cover each boundary directly.

**Tech Stack:** Next.js 16 route handlers, TypeScript, Prisma 7, Zod 4, Vitest.

**Final Review Adjustments:** The completed implementation keeps the endpoint public while capping ranked `limit` values at 100, capping all intervals at 366 days, returning response-local labels for `favoritesPerDevice` instead of raw device cookie IDs, and formatting daily SQL aggregation dates in PostgreSQL with `TO_CHAR(..., 'YYYY-MM-DD')`.

---

## File Structure

- Create `lib/analytics-service.ts`: metric enum, request schema, response types, interval validation, service factory, and metric dispatch.
- Create `lib/analytics-repository.ts`: Prisma-backed implementation of the analytics repository interface.
- Create `app/api/analytics/route.ts`: public `POST` route with JSON parsing, service invocation, and error responses.
- Create `tests/analytics-service.test.ts`: validation and dispatch tests with an in-memory repository fake.
- Create `tests/analytics-repository.test.ts`: Prisma query mapping tests with mocked Prisma methods.
- Create `tests/analytics-route.test.ts`: route-level success and error tests with a mocked analytics service.

## Task 1: Analytics Service Contract

**Files:**

- Create: `tests/analytics-service.test.ts`
- Create: `lib/analytics-service.ts`

- [ ] **Step 1: Write failing service validation and dispatch tests**

Create `tests/analytics-service.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  createAnalyticsService,
  type AnalyticsMetric,
  type AnalyticsRepository,
} from "@/lib/analytics-service";

const interval = {
  from: new Date("2026-06-09T00:00:00.000Z"),
  to: new Date("2026-06-16T00:00:00.000Z"),
};

const createRepository = (): AnalyticsRepository => ({
  favoritesPerDevice: vi.fn().mockResolvedValue([{ deviceId: "device-a", count: 2 }]),
  loadedCitiesPerCountry: vi.fn().mockResolvedValue([{ country: "UA", count: 3 }]),
  topLoadedCities: vi.fn().mockResolvedValue([{ city: "Kyiv", count: 4 }]),
  devicesAddedPerDay: vi.fn().mockResolvedValue([{ date: "2026-06-09", count: 1 }]),
  topFavoritedCities: vi.fn().mockResolvedValue([{ city: "Kyiv", count: 5 }]),
  favoriteAddsPerDay: vi.fn().mockResolvedValue([{ date: "2026-06-09", count: 2 }]),
  uniqueDevicesLoadingCities: vi.fn().mockResolvedValue({ count: 7 }),
});

describe("analytics service", () => {
  let repository: AnalyticsRepository;
  let service: ReturnType<typeof createAnalyticsService>;

  beforeEach(() => {
    repository = createRepository();
    service = createAnalyticsService(repository);
  });

  test("rejects unsupported metrics", async () => {
    await expect(
      service.getMetric({
        metric: "unknown",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
      }),
    ).rejects.toThrow("Unsupported analytics metric");
  });

  test("rejects invalid intervals", async () => {
    await expect(
      service.getMetric({
        metric: "favoritesPerDevice",
        from: "2026-06-16T00:00:00.000Z",
        to: "2026-06-09T00:00:00.000Z",
      }),
    ).rejects.toThrow("from must be earlier than to");
  });

  test("requires limit for ranked metrics", async () => {
    await expect(
      service.getMetric({
        metric: "topLoadedCities",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
      }),
    ).rejects.toThrow("limit is required for this metric");
  });

  test("rejects limit for non-ranked metrics", async () => {
    await expect(
      service.getMetric({
        metric: "devicesAddedPerDay",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
        limit: 10,
      }),
    ).rejects.toThrow("limit is only supported for ranked metrics");
  });

  test("dispatches favorites per device with parsed dates", async () => {
    await expect(
      service.getMetric({
        metric: "favoritesPerDevice",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
      }),
    ).resolves.toEqual({
      metric: "favoritesPerDevice",
      from: "2026-06-09T00:00:00.000Z",
      to: "2026-06-16T00:00:00.000Z",
      data: [{ deviceId: "device-a", count: 2 }],
    });

    expect(repository.favoritesPerDevice).toHaveBeenCalledWith(interval);
  });

  test.each([
    ["loadedCitiesPerCountry", "loadedCitiesPerCountry"],
    ["devicesAddedPerDay", "devicesAddedPerDay"],
    ["favoriteAddsPerDay", "favoriteAddsPerDay"],
    ["uniqueDevicesLoadingCities", "uniqueDevicesLoadingCities"],
  ] as [AnalyticsMetric, keyof AnalyticsRepository][])(
    "dispatches %s without a limit",
    async (metric, methodName) => {
      await service.getMetric({
        metric,
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
      });

      expect(repository[methodName]).toHaveBeenCalledWith(interval);
    },
  );

  test.each([
    ["topLoadedCities", "topLoadedCities"],
    ["topFavoritedCities", "topFavoritedCities"],
  ] as [AnalyticsMetric, keyof AnalyticsRepository][])(
    "dispatches %s with a limit",
    async (metric, methodName) => {
      await service.getMetric({
        metric,
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
        limit: 5,
      });

      expect(repository[methodName]).toHaveBeenCalledWith(interval, 5);
    },
  );
});
```

- [ ] **Step 2: Run the service test to verify it fails**

Run: `npm test -- tests/analytics-service.test.ts`

Expected: FAIL because `@/lib/analytics-service` does not exist.

- [ ] **Step 3: Implement the minimal analytics service**

Create `lib/analytics-service.ts`:

```ts
import { z } from "zod";

export const analyticsMetrics = [
  "favoritesPerDevice",
  "loadedCitiesPerCountry",
  "topLoadedCities",
  "devicesAddedPerDay",
  "topFavoritedCities",
  "favoriteAddsPerDay",
  "uniqueDevicesLoadingCities",
] as const;

export type AnalyticsMetric = (typeof analyticsMetrics)[number];

export type AnalyticsInterval = {
  from: Date;
  to: Date;
};

export type CountByDevice = { deviceId: string; count: number };
export type CountByCountry = { country: string; count: number };
export type CountByCity = { city: string; count: number };
export type CountByDay = { date: string; count: number };
export type UniqueCount = { count: number };

export type AnalyticsRepository = {
  favoritesPerDevice(interval: AnalyticsInterval): Promise<CountByDevice[]>;
  loadedCitiesPerCountry(interval: AnalyticsInterval): Promise<CountByCountry[]>;
  topLoadedCities(interval: AnalyticsInterval, limit: number): Promise<CountByCity[]>;
  devicesAddedPerDay(interval: AnalyticsInterval): Promise<CountByDay[]>;
  topFavoritedCities(interval: AnalyticsInterval, limit: number): Promise<CountByCity[]>;
  favoriteAddsPerDay(interval: AnalyticsInterval): Promise<CountByDay[]>;
  uniqueDevicesLoadingCities(interval: AnalyticsInterval): Promise<UniqueCount>;
};

const rankedMetrics = new Set<AnalyticsMetric>(["topLoadedCities", "topFavoritedCities"]);

const dateStringSchema = z.string().datetime({ offset: true });

const analyticsRequestSchema = z
  .object({
    metric: z.enum(analyticsMetrics, { error: "Unsupported analytics metric" }),
    from: dateStringSchema,
    to: dateStringSchema,
    limit: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const from = new Date(value.from);
    const to = new Date(value.to);

    if (from >= to) {
      context.addIssue({
        code: "custom",
        path: ["from"],
        message: "from must be earlier than to",
      });
    }

    if (rankedMetrics.has(value.metric) && value.limit === undefined) {
      context.addIssue({
        code: "custom",
        path: ["limit"],
        message: "limit is required for this metric",
      });
    }

    if (!rankedMetrics.has(value.metric) && value.limit !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["limit"],
        message: "limit is only supported for ranked metrics",
      });
    }
  });

export type AnalyticsRequest = z.input<typeof analyticsRequestSchema>;

export class AnalyticsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsValidationError";
  }
}

const parseRequest = (payload: unknown) => {
  const result = analyticsRequestSchema.safeParse(payload);

  if (!result.success) {
    throw new AnalyticsValidationError(
      result.error.issues[0]?.message ?? "Invalid analytics request",
    );
  }

  return {
    ...result.data,
    interval: {
      from: new Date(result.data.from),
      to: new Date(result.data.to),
    },
  };
};

export const createAnalyticsService = (repository: AnalyticsRepository) => ({
  async getMetric(payload: unknown) {
    const request = parseRequest(payload);
    const base = {
      metric: request.metric,
      from: request.interval.from.toISOString(),
      to: request.interval.to.toISOString(),
    };

    switch (request.metric) {
      case "favoritesPerDevice":
        return { ...base, data: await repository.favoritesPerDevice(request.interval) };
      case "loadedCitiesPerCountry":
        return { ...base, data: await repository.loadedCitiesPerCountry(request.interval) };
      case "topLoadedCities":
        return { ...base, data: await repository.topLoadedCities(request.interval, request.limit) };
      case "devicesAddedPerDay":
        return { ...base, data: await repository.devicesAddedPerDay(request.interval) };
      case "topFavoritedCities":
        return {
          ...base,
          data: await repository.topFavoritedCities(request.interval, request.limit),
        };
      case "favoriteAddsPerDay":
        return { ...base, data: await repository.favoriteAddsPerDay(request.interval) };
      case "uniqueDevicesLoadingCities":
        return { ...base, data: await repository.uniqueDevicesLoadingCities(request.interval) };
    }
  },
});
```

- [ ] **Step 4: Run the service test to verify it passes**

Run: `npm test -- tests/analytics-service.test.ts`

Expected: PASS.

## Task 2: Prisma Analytics Repository

**Files:**

- Create: `tests/analytics-repository.test.ts`
- Create: `lib/analytics-repository.ts`

- [ ] **Step 1: Write failing repository mapping tests**

Create `tests/analytics-repository.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  favoriteCity: {
    groupBy: vi.fn(),
  },
  loadedCity: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  device: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { analyticsService } from "@/lib/analytics-repository";

const interval = {
  from: new Date("2026-06-09T00:00:00.000Z"),
  to: new Date("2026-06-16T00:00:00.000Z"),
};

describe("analytics repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("counts favorites per device in the interval", async () => {
    prismaMock.favoriteCity.groupBy.mockResolvedValueOnce([
      { deviceId: "device-a", _count: { _all: 2 } },
    ]);

    await expect(
      analyticsService.getMetric({
        metric: "favoritesPerDevice",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
      }),
    ).resolves.toMatchObject({
      data: [{ deviceId: "device-a", count: 2 }],
    });

    expect(prismaMock.favoriteCity.groupBy).toHaveBeenCalledWith({
      by: ["deviceId"],
      where: { createdAt: { gte: interval.from, lt: interval.to } },
      _count: { _all: true },
      orderBy: { deviceId: "asc" },
    });
  });

  test("counts loaded cities per country and labels missing countries", async () => {
    prismaMock.loadedCity.groupBy.mockResolvedValueOnce([
      { country: "UA", _count: { _all: 3 } },
      { country: null, _count: { _all: 1 } },
    ]);

    await expect(
      analyticsService.getMetric({
        metric: "loadedCitiesPerCountry",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
      }),
    ).resolves.toMatchObject({
      data: [
        { country: "UA", count: 3 },
        { country: "Unknown", count: 1 },
      ],
    });
  });

  test("returns top loaded cities using the requested limit", async () => {
    prismaMock.loadedCity.groupBy.mockResolvedValueOnce([{ city: "Kyiv", _count: { _all: 4 } }]);

    await expect(
      analyticsService.getMetric({
        metric: "topLoadedCities",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
        limit: 5,
      }),
    ).resolves.toMatchObject({
      data: [{ city: "Kyiv", count: 4 }],
    });

    expect(prismaMock.loadedCity.groupBy).toHaveBeenCalledWith({
      by: ["city"],
      where: { createdAt: { gte: interval.from, lt: interval.to } },
      _count: { _all: true },
      orderBy: [{ _count: { city: "desc" } }, { city: "asc" }],
      take: 5,
    });
  });

  test("groups device additions by UTC day", async () => {
    prismaMock.device.findMany.mockResolvedValueOnce([
      { createdAt: new Date("2026-06-09T10:00:00.000Z") },
      { createdAt: new Date("2026-06-09T18:00:00.000Z") },
      { createdAt: new Date("2026-06-10T08:00:00.000Z") },
    ]);

    await expect(
      analyticsService.getMetric({
        metric: "devicesAddedPerDay",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
      }),
    ).resolves.toMatchObject({
      data: [
        { date: "2026-06-09", count: 2 },
        { date: "2026-06-10", count: 1 },
      ],
    });
  });

  test("returns top favorited cities using the requested limit", async () => {
    prismaMock.favoriteCity.groupBy.mockResolvedValueOnce([{ city: "Kyiv", _count: { _all: 5 } }]);

    await expect(
      analyticsService.getMetric({
        metric: "topFavoritedCities",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
        limit: 10,
      }),
    ).resolves.toMatchObject({
      data: [{ city: "Kyiv", count: 5 }],
    });
  });

  test("groups favorite additions by UTC day", async () => {
    prismaMock.favoriteCity.groupBy.mockResolvedValueOnce([]);
    prismaMock.favoriteCity.findMany = vi
      .fn()
      .mockResolvedValueOnce([
        { createdAt: new Date("2026-06-09T10:00:00.000Z") },
        { createdAt: new Date("2026-06-10T08:00:00.000Z") },
      ]);

    await expect(
      analyticsService.getMetric({
        metric: "favoriteAddsPerDay",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
      }),
    ).resolves.toMatchObject({
      data: [
        { date: "2026-06-09", count: 1 },
        { date: "2026-06-10", count: 1 },
      ],
    });
  });

  test("counts unique devices that loaded cities", async () => {
    prismaMock.loadedCity.findMany.mockResolvedValueOnce([
      { deviceId: "device-a" },
      { deviceId: "device-b" },
    ]);

    await expect(
      analyticsService.getMetric({
        metric: "uniqueDevicesLoadingCities",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
      }),
    ).resolves.toMatchObject({
      data: { count: 2 },
    });
  });
});
```

- [ ] **Step 2: Run the repository test to verify it fails**

Run: `npm test -- tests/analytics-repository.test.ts`

Expected: FAIL because `@/lib/analytics-repository` does not exist.

- [ ] **Step 3: Implement the Prisma repository**

Create `lib/analytics-repository.ts`:

```ts
import {
  createAnalyticsService,
  type AnalyticsInterval,
  type CountByDay,
} from "@/lib/analytics-service";
import { prisma } from "@/lib/prisma";

const intervalWhere = (interval: AnalyticsInterval) => ({
  createdAt: {
    gte: interval.from,
    lt: interval.to,
  },
});

const groupDatesByUtcDay = (rows: { createdAt: Date }[]): CountByDay[] => {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const day = row.createdAt.toISOString().slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, count]) => ({ date, count }));
};

const repository = {
  async favoritesPerDevice(interval: AnalyticsInterval) {
    const rows = await prisma.favoriteCity.groupBy({
      by: ["deviceId"],
      where: intervalWhere(interval),
      _count: { _all: true },
      orderBy: { deviceId: "asc" },
    });

    return rows.map((row) => ({ deviceId: row.deviceId, count: row._count._all }));
  },

  async loadedCitiesPerCountry(interval: AnalyticsInterval) {
    const rows = await prisma.loadedCity.groupBy({
      by: ["country"],
      where: intervalWhere(interval),
      _count: { _all: true },
      orderBy: { country: "asc" },
    });

    return rows.map((row) => ({ country: row.country ?? "Unknown", count: row._count._all }));
  },

  async topLoadedCities(interval: AnalyticsInterval, limit: number) {
    const rows = await prisma.loadedCity.groupBy({
      by: ["city"],
      where: intervalWhere(interval),
      _count: { _all: true },
      orderBy: [{ _count: { city: "desc" } }, { city: "asc" }],
      take: limit,
    });

    return rows.map((row) => ({ city: row.city, count: row._count._all }));
  },

  async devicesAddedPerDay(interval: AnalyticsInterval) {
    const rows = await prisma.device.findMany({
      where: intervalWhere(interval),
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    return groupDatesByUtcDay(rows);
  },

  async topFavoritedCities(interval: AnalyticsInterval, limit: number) {
    const rows = await prisma.favoriteCity.groupBy({
      by: ["city"],
      where: intervalWhere(interval),
      _count: { _all: true },
      orderBy: [{ _count: { city: "desc" } }, { city: "asc" }],
      take: limit,
    });

    return rows.map((row) => ({ city: row.city, count: row._count._all }));
  },

  async favoriteAddsPerDay(interval: AnalyticsInterval) {
    const rows = await prisma.favoriteCity.findMany({
      where: intervalWhere(interval),
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    return groupDatesByUtcDay(rows);
  },

  async uniqueDevicesLoadingCities(interval: AnalyticsInterval) {
    const rows = await prisma.loadedCity.findMany({
      where: intervalWhere(interval),
      distinct: ["deviceId"],
      select: { deviceId: true },
    });

    return { count: rows.length };
  },
};

export const analyticsService = createAnalyticsService(repository);
```

- [ ] **Step 4: Run repository and service tests**

Run: `npm test -- tests/analytics-service.test.ts tests/analytics-repository.test.ts`

Expected: PASS.

## Task 3: Analytics Route Handler

**Files:**

- Create: `tests/analytics-route.test.ts`
- Create: `app/api/analytics/route.ts`

- [ ] **Step 1: Write failing route tests**

Create `tests/analytics-route.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AnalyticsValidationError } from "@/lib/analytics-service";

const analyticsServiceMock = vi.hoisted(() => ({
  getMetric: vi.fn(),
}));

vi.mock("@/lib/analytics-repository", () => ({
  analyticsService: analyticsServiceMock,
}));

import { POST } from "@/app/api/analytics/route";

describe("analytics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns the requested analytics metric", async () => {
    const analyticsResponse = {
      metric: "topLoadedCities",
      from: "2026-06-09T00:00:00.000Z",
      to: "2026-06-16T00:00:00.000Z",
      data: [{ city: "Kyiv", count: 12 }],
    };
    analyticsServiceMock.getMetric.mockResolvedValueOnce(analyticsResponse);

    const body = {
      metric: "topLoadedCities",
      from: "2026-06-09T00:00:00.000Z",
      to: "2026-06-16T00:00:00.000Z",
      limit: 5,
    };

    const response = await POST(
      new Request("https://example.com/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );

    await expect(response.json()).resolves.toEqual(analyticsResponse);
    expect(response.status).toBe(200);
    expect(analyticsServiceMock.getMetric).toHaveBeenCalledWith(body);
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });

  test("returns 400 for invalid JSON", async () => {
    const response = await POST(
      new Request("https://example.com/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );

    await expect(response.json()).resolves.toEqual({ message: "Invalid JSON request body" });
    expect(response.status).toBe(400);
    expect(analyticsServiceMock.getMetric).not.toHaveBeenCalled();
  });

  test("returns 400 for validation errors", async () => {
    analyticsServiceMock.getMetric.mockRejectedValueOnce(
      new AnalyticsValidationError("limit is required for this metric"),
    );

    const response = await POST(
      new Request("https://example.com/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metric: "topLoadedCities",
          from: "2026-06-09T00:00:00.000Z",
          to: "2026-06-16T00:00:00.000Z",
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      message: "limit is required for this metric",
    });
    expect(response.status).toBe(400);
  });

  test("returns 500 for unexpected errors", async () => {
    analyticsServiceMock.getMetric.mockRejectedValueOnce(new Error("database offline"));

    const response = await POST(
      new Request("https://example.com/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metric: "favoritesPerDevice",
          from: "2026-06-09T00:00:00.000Z",
          to: "2026-06-16T00:00:00.000Z",
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({ message: "Unable to load analytics" });
    expect(response.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run the route test to verify it fails**

Run: `npm test -- tests/analytics-route.test.ts`

Expected: FAIL because `@/app/api/analytics/route` does not exist.

- [ ] **Step 3: Implement the route handler**

Create `app/api/analytics/route.ts`:

```ts
import { NextResponse } from "next/server";
import { AnalyticsValidationError } from "@/lib/analytics-service";
import { analyticsService } from "@/lib/analytics-repository";

export const POST = async (request: Request) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON request body" }, { status: 400 });
  }

  try {
    const result = await analyticsService.getMetric(payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AnalyticsValidationError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Unable to load analytics" }, { status: 500 });
  }
};
```

- [ ] **Step 4: Run route and analytics tests**

Run: `npm test -- tests/analytics-service.test.ts tests/analytics-repository.test.ts tests/analytics-route.test.ts`

Expected: PASS.

## Task 4: Documentation and Verification

**Files:**

- Modify: `README.md`
- Verify: `lib/analytics-service.ts`, `lib/analytics-repository.ts`, `app/api/analytics/route.ts`, `tests/analytics-service.test.ts`, `tests/analytics-repository.test.ts`, `tests/analytics-route.test.ts`

- [ ] **Step 1: Add README API notes**

Modify `README.md` by adding this section after `## Features`:

````md
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
````

Supported metrics are `favoritesPerDevice`, `loadedCitiesPerCountry`, `topLoadedCities`, `devicesAddedPerDay`, `topFavoritedCities`, `favoriteAddsPerDay`, and `uniqueDevicesLoadingCities`.

`limit` is required for `topLoadedCities` and `topFavoritedCities`; other metrics reject `limit`.

```

- [ ] **Step 2: Run focused tests**

Run: `npm test -- tests/analytics-service.test.ts tests/analytics-repository.test.ts tests/analytics-route.test.ts`

Expected: PASS with coverage output and no test failures.

- [ ] **Step 3: Run static verification**

Run: `npm run typecheck`

Expected: PASS with no TypeScript errors.

Run: `npm run lint`

Expected: PASS with no ESLint errors.

- [ ] **Step 4: Run full test suite if focused verification is clean**

Run: `npm test`

Expected: PASS with coverage at or above the repository threshold.

- [ ] **Step 5: Check git status**

Run: `git status --short`

Expected: Only the analytics API files, tests, README update, and design/plan docs are changed. Do not commit unless the user explicitly requests a commit.

## Self-Review

- Spec coverage: The plan covers the public `POST /api/analytics` endpoint, unified request schema, metric enum, explicit `from`/`to`, no defaults, ranked metric limits, all five requested metrics, and two suggested metrics.
- Placeholder scan: No `TBD`, `TODO`, "similar to", or unfilled implementation steps remain.
- Type consistency: The route imports `analyticsService` from `lib/analytics-repository.ts`; service tests use `createAnalyticsService`; repository tests exercise the exported Prisma-backed service through the public `getMetric` interface.
```
