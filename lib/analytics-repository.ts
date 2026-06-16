import {
  createAnalyticsService,
  type AnalyticsInterval,
  type CountByDay,
} from "@/lib/analytics-service";
import { prisma } from "@/lib/prisma";

type RawCountByDay = {
  date: string;
  count: bigint | number | string;
};

type RawCount = {
  count: bigint | number | string | null;
};

const intervalWhere = (interval: AnalyticsInterval) => ({
  createdAt: {
    gte: interval.from,
    lt: interval.to,
  },
});

const mapRawCountsByDay = (rows: RawCountByDay[]): CountByDay[] => {
  return rows.map((row) => ({ date: String(row.date), count: Number(row.count) }));
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
    const rows = await prisma.$queryRaw<RawCountByDay[]>`
      SELECT TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
      FROM "Device"
      WHERE "createdAt" >= ${interval.from} AND "createdAt" < ${interval.to}
      GROUP BY date
      ORDER BY date ASC
    `;

    return mapRawCountsByDay(rows);
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
    const rows = await prisma.$queryRaw<RawCountByDay[]>`
      SELECT TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
      FROM "FavoriteCity"
      WHERE "createdAt" >= ${interval.from} AND "createdAt" < ${interval.to}
      GROUP BY date
      ORDER BY date ASC
    `;

    return mapRawCountsByDay(rows);
  },

  async uniqueDevicesLoadingCities(interval: AnalyticsInterval) {
    const rows = await prisma.$queryRaw<RawCount[]>`
      SELECT COUNT(DISTINCT "deviceId")::int AS count
      FROM "LoadedCity"
      WHERE "createdAt" >= ${interval.from} AND "createdAt" < ${interval.to}
    `;

    return { count: Number(rows[0]?.count ?? 0) };
  },
};

export const analyticsService = createAnalyticsService(repository);
