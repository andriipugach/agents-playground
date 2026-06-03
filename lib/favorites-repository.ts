import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFavoritesService } from "@/lib/favorites-service";
type FavoriteRow = {
  id: number;
  city: string;
  createdAt: string;
};

const favoritesFilePath = path.join(process.cwd(), "data", "favorites.json");

const ensureStore = async () => {
  await mkdir(path.dirname(favoritesFilePath), { recursive: true });
  try {
    await readFile(favoritesFilePath, "utf8");
  } catch {
    await writeFile(favoritesFilePath, "[]", "utf8");
  }
};

const readRows = async (): Promise<FavoriteRow[]> => {
  await ensureStore();
  const raw = await readFile(favoritesFilePath, "utf8");
  return JSON.parse(raw) as FavoriteRow[];
};

const writeRows = async (rows: FavoriteRow[]) => {
  await writeFile(favoritesFilePath, JSON.stringify(rows, null, 2), "utf8");
};

const repository = {
  async list() {
    const rows = await readRows();
    return rows
      .map((row) => ({ ...row, createdAt: new Date(row.createdAt) }))
      .sort((a, b) => a.city.localeCompare(b.city));
  },

  async create(city: string) {
    const rows = await readRows();
    if (rows.some((row) => row.city.toLowerCase() === city.toLowerCase())) {
      throw new Error("duplicate");
    }

    const maxId = rows.reduce((current, row) => Math.max(current, row.id), 0);
    const created = {
      id: maxId + 1,
      city,
      createdAt: new Date(),
    };

    rows.push({ ...created, createdAt: created.createdAt.toISOString() });
    await writeRows(rows);
    return created;
  },

  async remove(id: number) {
    const rows = await readRows();
    const nextRows = rows.filter((row) => row.id !== id);
    await writeRows(nextRows);
  },
};

export const favoritesService = createFavoritesService(repository);
