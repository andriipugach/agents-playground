import { beforeEach, describe, expect, test } from "vitest";
import { createFavoritesService, type FavoritesRepository } from "@/lib/favorites-service";

const createInMemoryRepository = (): FavoritesRepository => {
  let rows: { id: number; deviceId: string; city: string; createdAt: Date }[] = [];
  let id = 1;

  return {
    async list(deviceId) {
      return rows
        .filter((row) => row.deviceId === deviceId)
        .sort((a, b) => a.city.localeCompare(b.city));
    },
    async create(deviceId, city: string) {
      const exists = rows.find(
        (row) => row.deviceId === deviceId && row.city.toLowerCase() === city.toLowerCase(),
      );
      if (exists) {
        throw new Error("duplicate");
      }

      const created = {
        id: id++,
        deviceId,
        city,
        createdAt: new Date("2026-06-03T10:00:00.000Z"),
      };
      rows.push(created);
      return created;
    },
    async remove(deviceId, idToRemove: number) {
      rows = rows.filter((row) => row.deviceId !== deviceId || row.id !== idToRemove);
    },
  };
};

describe("favorites service", () => {
  let service: ReturnType<typeof createFavoritesService>;

  beforeEach(() => {
    service = createFavoritesService(createInMemoryRepository());
  });

  test("adds and lists unique favorite cities", async () => {
    await service.add("device-a", "Kyiv");
    await service.add("device-a", "Berlin");

    const favorites = await service.list("device-a");
    expect(favorites).toHaveLength(2);
    expect(favorites.map((item) => item.city)).toEqual(["Berlin", "Kyiv"]);
  });

  test("scopes favorite cities to each device", async () => {
    await service.add("device-a", "London");
    await service.add("device-b", "London");

    await expect(service.list("device-a")).resolves.toEqual([
      { id: 1, city: "London", createdAt: "2026-06-03T10:00:00.000Z" },
    ]);
    await expect(service.list("device-b")).resolves.toEqual([
      { id: 2, city: "London", createdAt: "2026-06-03T10:00:00.000Z" },
    ]);
  });

  test("rejects duplicate city names for the same device regardless of case", async () => {
    await service.add("device-a", "London");
    await expect(service.add("device-a", "london")).rejects.toThrow("City already in favorites");
  });

  test("rejects empty city values", async () => {
    await expect(service.add("device-a", "   ")).rejects.toThrow("City is required");
  });

  test("rethrows unexpected repository errors", async () => {
    const failingService = createFavoritesService({
      async list() {
        return [];
      },
      async create() {
        throw new Error("database offline");
      },
      async remove() {
        return;
      },
    });

    await expect(failingService.add("device-a", "Rome")).rejects.toThrow("database offline");
  });

  test("removes favorites only for the matching device", async () => {
    await service.add("device-a", "Madrid");
    await service.add("device-b", "Madrid");
    await service.remove("device-a", 1);

    await expect(service.list("device-a")).resolves.toHaveLength(0);
    await expect(service.list("device-b")).resolves.toHaveLength(1);
  });
});
