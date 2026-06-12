import { createFavoritesService } from "@/lib/favorites-service";
import { prisma } from "@/lib/prisma";

const repository = {
  async list(deviceId: string) {
    return prisma.favoriteCity.findMany({
      where: { deviceId },
      orderBy: { city: "asc" },
    });
  },

  async create(deviceId: string, city: string) {
    try {
      return await prisma.favoriteCity.create({
        data: {
          city,
          device: {
            connectOrCreate: {
              where: { id: deviceId },
              create: { id: deviceId },
            },
          },
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error("duplicate", { cause: error });
      }

      throw error;
    }
  },

  async remove(deviceId: string, id: number) {
    await prisma.favoriteCity.deleteMany({ where: { id, deviceId } });
  },
};

const isUniqueConstraintError = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  return error.code === "P2002";
};

export const favoritesService = createFavoritesService(repository);
