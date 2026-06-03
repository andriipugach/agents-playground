import type { FavoriteCity } from "@/lib/types";

type FavoriteCityRow = {
  id: number;
  city: string;
  createdAt: Date;
};

export type FavoritesRepository = {
  list: () => Promise<FavoriteCityRow[]>;
  create: (city: string) => Promise<FavoriteCityRow>;
  remove: (id: number) => Promise<void>;
};

type FavoritesService = {
  list: () => Promise<FavoriteCity[]>;
  add: (city: string) => Promise<FavoriteCity>;
  remove: (id: number) => Promise<void>;
};

const toDto = (row: FavoriteCityRow): FavoriteCity => ({
  id: row.id,
  city: row.city,
  createdAt: row.createdAt.toISOString(),
});

export const createFavoritesService = (repository: FavoritesRepository): FavoritesService => ({
  async list() {
    const rows = await repository.list();
    return rows.map(toDto);
  },

  async add(city: string) {
    const normalizedCity = city.trim();
    if (!normalizedCity) {
      throw new Error("City is required");
    }

    try {
      const row = await repository.create(normalizedCity);
      return toDto(row);
    } catch (error) {
      if (error instanceof Error && /duplicate/i.test(error.message)) {
        throw new Error("City already in favorites");
      }

      throw error;
    }
  },

  async remove(id: number) {
    await repository.remove(id);
  },
});
