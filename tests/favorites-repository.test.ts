import { beforeEach, describe, expect, test, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  favoriteCity: {
    findMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { favoritesService } from "@/lib/favorites-repository";

describe("favorites repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("lists favorite cities from Prisma sorted by city", async () => {
    prismaMock.favoriteCity.findMany.mockResolvedValueOnce([
      { id: 1, city: "Berlin", createdAt: new Date("2026-06-03T10:00:00.000Z") },
    ]);

    await expect(favoritesService.list()).resolves.toEqual([
      { id: 1, city: "Berlin", createdAt: "2026-06-03T10:00:00.000Z" },
    ]);
    expect(prismaMock.favoriteCity.findMany).toHaveBeenCalledWith({ orderBy: { city: "asc" } });
  });

  test("creates favorite cities through Prisma", async () => {
    prismaMock.favoriteCity.create.mockResolvedValueOnce({
      id: 2,
      city: "Kyiv",
      createdAt: new Date("2026-06-03T10:00:00.000Z"),
    });

    await expect(favoritesService.add(" Kyiv ")).resolves.toEqual({
      id: 2,
      city: "Kyiv",
      createdAt: "2026-06-03T10:00:00.000Z",
    });
    expect(prismaMock.favoriteCity.create).toHaveBeenCalledWith({ data: { city: "Kyiv" } });
  });

  test("reports duplicate Prisma favorite cities with the user-facing message", async () => {
    prismaMock.favoriteCity.create.mockRejectedValueOnce(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    await expect(favoritesService.add("Kyiv")).rejects.toThrow("City already in favorites");
  });

  test("removes favorite cities through Prisma", async () => {
    prismaMock.favoriteCity.deleteMany.mockResolvedValueOnce({ count: 1 });

    await favoritesService.remove(7);

    expect(prismaMock.favoriteCity.deleteMany).toHaveBeenCalledWith({ where: { id: 7 } });
  });
});
