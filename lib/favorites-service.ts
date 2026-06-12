import type { FavoriteCity } from "@/lib/types";

type FavoriteCityRow = {
  id: number;
  city: string;
  createdAt: Date;
};

export type FavoritesRepository = {
  list: (deviceId: string) => Promise<FavoriteCityRow[]>;
  create: (deviceId: string, city: string) => Promise<FavoriteCityRow>;
  remove: (deviceId: string, id: number) => Promise<void>;
};

type FavoritesService = {
  list: (deviceId: string) => Promise<FavoriteCity[]>;
  add: (deviceId: string, city: string) => Promise<FavoriteCity>;
  remove: (deviceId: string, id: number) => Promise<void>;
};

const toDto = (row: FavoriteCityRow): FavoriteCity => ({
  id: row.id,
  city: row.city,
  createdAt: row.createdAt.toISOString(),
});

export const createFavoritesService = (repository: FavoritesRepository): FavoritesService => ({
  async list(deviceId: string) {
    const rows = await repository.list(deviceId);
    return rows.map(toDto);
  },

  async add(deviceId: string, city: string) {
    const normalizedCity = city.trim();
    if (!normalizedCity) {
      throw new Error("City is required");
    }

    try {
      const row = await repository.create(deviceId, normalizedCity);
      return toDto(row);
    } catch (error) {
      if (error instanceof Error && /duplicate/i.test(error.message)) {
        throw new Error("City already in favorites", { cause: error });
      }

      throw error;
    }
  },

  async remove(deviceId: string, id: number) {
    await repository.remove(deviceId, id);
  },
});
