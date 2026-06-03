import { beforeEach, describe, expect, test } from "vitest";
import { createFavoritesService, type FavoritesRepository } from "@/lib/favorites-service";

const createInMemoryRepository = (): FavoritesRepository => {
  let rows: { id: number; city: string; createdAt: Date }[] = [];
  let id = 1;

  return {
    async list() {
      return [...rows].sort((a, b) => a.city.localeCompare(b.city));
    },
    async create(city: string) {
      const exists = rows.find((row) => row.city.toLowerCase() === city.toLowerCase());
      if (exists) {
        throw new Error("duplicate");
      }

      const created = { id: id++, city, createdAt: new Date("2026-06-03T10:00:00.000Z") };
      rows.push(created);
      return created;
    },
    async remove(idToRemove: number) {
      rows = rows.filter((row) => row.id !== idToRemove);
    },
  };
};

describe("favorites service", () => {
  let service: ReturnType<typeof createFavoritesService>;

  beforeEach(() => {
    service = createFavoritesService(createInMemoryRepository());
  });

  test("adds and lists unique favorite cities", async () => {
    await service.add("Kyiv");
    await service.add("Berlin");

    const favorites = await service.list();
    expect(favorites).toHaveLength(2);
    expect(favorites.map((item) => item.city)).toEqual(["Berlin", "Kyiv"]);
  });

  test("rejects duplicate city names regardless of case", async () => {
    await service.add("London");
    await expect(service.add("london")).rejects.toThrow("City already in favorites");
  });

  test("rejects empty city values", async () => {
    await expect(service.add("   ")).rejects.toThrow("City is required");
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

    await expect(failingService.add("Rome")).rejects.toThrow("database offline");
  });

  test("removes favorites through repository", async () => {
    await service.add("Madrid");
    await service.remove(1);
    const favorites = await service.list();
    expect(favorites).toHaveLength(0);
  });
});
