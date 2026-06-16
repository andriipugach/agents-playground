import { beforeEach, describe, expect, test, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  favoriteCity: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
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

const requestInterval = {
  from: "2026-06-09T00:00:00.000Z",
  to: "2026-06-16T00:00:00.000Z",
};

const intervalWhere = {
  createdAt: {
    gte: interval.from,
    lt: interval.to,
  },
};

describe("analytics repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("maps favorites per device grouped in the interval", async () => {
    prismaMock.favoriteCity.groupBy.mockResolvedValueOnce([
      { deviceId: "device-a", _count: { _all: 2 } },
      { deviceId: "device-b", _count: { _all: 1 } },
    ]);

    await expect(
      analyticsService.getMetric({
        metric: "favoritesPerDevice",
        ...requestInterval,
      }),
    ).resolves.toMatchObject({
      data: [
        { device: "device-1", count: 2 },
        { device: "device-2", count: 1 },
      ],
    });

    expect(prismaMock.favoriteCity.groupBy).toHaveBeenCalledWith({
      by: ["deviceId"],
      where: intervalWhere,
      _count: { _all: true },
      orderBy: { deviceId: "asc" },
    });
  });

  test("maps loaded cities per country and labels null country as Unknown", async () => {
    prismaMock.loadedCity.groupBy.mockResolvedValueOnce([
      { country: null, _count: { _all: 1 } },
      { country: "UA", _count: { _all: 3 } },
    ]);

    await expect(
      analyticsService.getMetric({
        metric: "loadedCitiesPerCountry",
        ...requestInterval,
      }),
    ).resolves.toMatchObject({
      data: [
        { country: "Unknown", count: 1 },
        { country: "UA", count: 3 },
      ],
    });

    expect(prismaMock.loadedCity.groupBy).toHaveBeenCalledWith({
      by: ["country"],
      where: intervalWhere,
      _count: { _all: true },
      orderBy: { country: "asc" },
    });
  });

  test("maps top loaded cities and uses the requested limit", async () => {
    prismaMock.loadedCity.groupBy.mockResolvedValueOnce([{ city: "Kyiv", _count: { _all: 4 } }]);

    await expect(
      analyticsService.getMetric({
        metric: "topLoadedCities",
        ...requestInterval,
        limit: 5,
      }),
    ).resolves.toMatchObject({
      data: [{ city: "Kyiv", count: 4 }],
    });

    expect(prismaMock.loadedCity.groupBy).toHaveBeenCalledWith({
      by: ["city"],
      where: intervalWhere,
      _count: { _all: true },
      orderBy: [{ _count: { city: "desc" } }, { city: "asc" }],
      take: 5,
    });
  });

  test("groups devices added per day by database date strings", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      { date: "2026-06-09", count: BigInt(2) },
      { date: "2026-06-10", count: "1" },
    ]);

    await expect(
      analyticsService.getMetric({
        metric: "devicesAddedPerDay",
        ...requestInterval,
      }),
    ).resolves.toMatchObject({
      data: [
        { date: "2026-06-09", count: 2 },
        { date: "2026-06-10", count: 1 },
      ],
    });

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.$queryRaw.mock.calls[0]?.[0].join(" ")).toContain(
      `TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS date`,
    );
    expect(prismaMock.$queryRaw.mock.calls[0]).toEqual(
      expect.arrayContaining([interval.from, interval.to]),
    );
    expect(prismaMock.device.findMany).not.toHaveBeenCalled();
  });

  test("maps top favorited cities and uses the requested limit", async () => {
    prismaMock.favoriteCity.groupBy.mockResolvedValueOnce([{ city: "Kyiv", _count: { _all: 5 } }]);

    await expect(
      analyticsService.getMetric({
        metric: "topFavoritedCities",
        ...requestInterval,
        limit: 10,
      }),
    ).resolves.toMatchObject({
      data: [{ city: "Kyiv", count: 5 }],
    });

    expect(prismaMock.favoriteCity.groupBy).toHaveBeenCalledWith({
      by: ["city"],
      where: intervalWhere,
      _count: { _all: true },
      orderBy: [{ _count: { city: "desc" } }, { city: "asc" }],
      take: 10,
    });
  });

  test("groups favorite additions per day by database date strings", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      { date: "2026-06-09", count: "1" },
      { date: "2026-06-10", count: 2 },
    ]);

    await expect(
      analyticsService.getMetric({
        metric: "favoriteAddsPerDay",
        ...requestInterval,
      }),
    ).resolves.toMatchObject({
      data: [
        { date: "2026-06-09", count: 1 },
        { date: "2026-06-10", count: 2 },
      ],
    });

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.$queryRaw.mock.calls[0]?.[0].join(" ")).toContain(
      `TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS date`,
    );
    expect(prismaMock.$queryRaw.mock.calls[0]).toEqual(
      expect.arrayContaining([interval.from, interval.to]),
    );
    expect(prismaMock.favoriteCity.findMany).not.toHaveBeenCalled();
  });

  test("counts unique devices loading cities in the interval", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ count: "2" }]);

    await expect(
      analyticsService.getMetric({
        metric: "uniqueDevicesLoadingCities",
        ...requestInterval,
      }),
    ).resolves.toMatchObject({
      data: { count: 2 },
    });

    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.$queryRaw.mock.calls[0]).toEqual(
      expect.arrayContaining([interval.from, interval.to]),
    );
    expect(prismaMock.loadedCity.findMany).not.toHaveBeenCalled();
  });
});
