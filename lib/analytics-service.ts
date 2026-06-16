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

export type CountByDeviceId = { deviceId: string; count: number };
export type CountByDevice = { device: string; count: number };
export type CountByCountry = { country: string; count: number };
export type CountByCity = { city: string; count: number };
export type CountByDay = { date: string; count: number };
export type UniqueCount = { count: number };

export type AnalyticsRepository = {
  favoritesPerDevice(interval: AnalyticsInterval): Promise<CountByDeviceId[]>;
  loadedCitiesPerCountry(interval: AnalyticsInterval): Promise<CountByCountry[]>;
  topLoadedCities(interval: AnalyticsInterval, limit: number): Promise<CountByCity[]>;
  devicesAddedPerDay(interval: AnalyticsInterval): Promise<CountByDay[]>;
  topFavoritedCities(interval: AnalyticsInterval, limit: number): Promise<CountByCity[]>;
  favoriteAddsPerDay(interval: AnalyticsInterval): Promise<CountByDay[]>;
  uniqueDevicesLoadingCities(interval: AnalyticsInterval): Promise<UniqueCount>;
};

const rankedMetrics = new Set<AnalyticsMetric>(["topLoadedCities", "topFavoritedCities"]);
const maxRankedLimit = 100;
const maxIntervalMilliseconds = 366 * 24 * 60 * 60 * 1000;

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

    if (to.getTime() - from.getTime() > maxIntervalMilliseconds) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "interval must not exceed 366 days",
      });
    }

    if (rankedMetrics.has(value.metric) && value.limit === undefined) {
      context.addIssue({
        code: "custom",
        path: ["limit"],
        message: "limit is required for this metric",
      });
    }

    if (value.limit !== undefined && value.limit > maxRankedLimit) {
      context.addIssue({
        code: "custom",
        path: ["limit"],
        message: "limit must be at most 100",
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

const requireLimit = (limit: number | undefined) => {
  if (limit === undefined) {
    throw new AnalyticsValidationError("limit is required for this metric");
  }

  return limit;
};

const labelDevices = (rows: CountByDeviceId[]): CountByDevice[] => {
  return [...rows]
    .sort((left, right) => left.deviceId.localeCompare(right.deviceId))
    .map((row, index) => ({ device: `device-${index + 1}`, count: row.count }));
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
        return {
          ...base,
          data: labelDevices(await repository.favoritesPerDevice(request.interval)),
        };
      case "loadedCitiesPerCountry":
        return { ...base, data: await repository.loadedCitiesPerCountry(request.interval) };
      case "topLoadedCities":
        return {
          ...base,
          data: await repository.topLoadedCities(request.interval, requireLimit(request.limit)),
        };
      case "devicesAddedPerDay":
        return { ...base, data: await repository.devicesAddedPerDay(request.interval) };
      case "topFavoritedCities":
        return {
          ...base,
          data: await repository.topFavoritedCities(request.interval, requireLimit(request.limit)),
        };
      case "favoriteAddsPerDay":
        return { ...base, data: await repository.favoriteAddsPerDay(request.interval) };
      case "uniqueDevicesLoadingCities":
        return { ...base, data: await repository.uniqueDevicesLoadingCities(request.interval) };
    }
  },
});
