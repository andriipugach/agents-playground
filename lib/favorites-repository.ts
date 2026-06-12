import { createFavoritesService } from "@/lib/favorites-service";
import { prisma } from "@/lib/prisma";

const repository = {
  async list() {
    return prisma.favoriteCity.findMany({ orderBy: { city: "asc" } });
  },

  async create(city: string) {
    try {
      return await prisma.favoriteCity.create({ data: { city } });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error("duplicate", { cause: error });
      }

      throw error;
    }
  },

  async remove(id: number) {
    await prisma.favoriteCity.deleteMany({ where: { id } });
  },
};

const isUniqueConstraintError = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  return error.code === "P2002";
};

export const favoritesService = createFavoritesService(repository);
