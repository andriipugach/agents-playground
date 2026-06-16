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
  favoritesPerDevice: vi.fn().mockResolvedValue([
    { deviceId: "device-a", count: 2 },
    { deviceId: "device-b", count: 1 },
  ]),
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

  test("rejects oversized limits for ranked metrics", async () => {
    await expect(
      service.getMetric({
        metric: "topLoadedCities",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
        limit: 101,
      }),
    ).rejects.toThrow("limit must be at most 100");
  });

  test("rejects intervals wider than 366 days", async () => {
    await expect(
      service.getMetric({
        metric: "favoritesPerDevice",
        from: "2025-06-09T00:00:00.000Z",
        to: "2026-06-11T00:00:00.000Z",
      }),
    ).rejects.toThrow("interval must not exceed 366 days");
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
      data: [
        { device: "device-1", count: 2 },
        { device: "device-2", count: 1 },
      ],
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
