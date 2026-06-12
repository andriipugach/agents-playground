import { beforeEach, describe, expect, test, vi } from "vitest";

const favoritesServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/favorites-repository", () => ({
  favoritesService: favoritesServiceMock,
}));

import { DELETE } from "@/app/api/favorites/[id]/route";
import { GET, POST } from "@/app/api/favorites/route";

describe("favorites route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("lists favorites for a generated device id and returns the device cookie", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValueOnce("generated-device-id");
    favoritesServiceMock.list.mockResolvedValueOnce([]);

    const response = await GET(new Request("https://example.com/api/favorites"));

    await expect(response.json()).resolves.toEqual([]);
    expect(favoritesServiceMock.list).toHaveBeenCalledWith("generated-device-id");
    expect(response.headers.get("Set-Cookie")).toContain("deviceId=generated-device-id");
  });

  test("adds favorites for the current device id", async () => {
    const favorite = { id: 1, city: "Kyiv", createdAt: "2026-06-03T10:00:00.000Z" };
    favoritesServiceMock.add.mockResolvedValueOnce(favorite);

    const response = await POST(
      new Request("https://example.com/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "deviceId=device-a",
        },
        body: JSON.stringify({ city: "Kyiv" }),
      }),
    );

    await expect(response.json()).resolves.toEqual(favorite);
    expect(response.status).toBe(201);
    expect(favoritesServiceMock.add).toHaveBeenCalledWith("device-a", "Kyiv");
  });

  test("removes favorites for the current device id", async () => {
    favoritesServiceMock.remove.mockResolvedValueOnce(undefined);

    const response = await DELETE(
      new Request("https://example.com/api/favorites/7", {
        method: "DELETE",
        headers: { cookie: "deviceId=device-a" },
      }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(204);
    expect(favoritesServiceMock.remove).toHaveBeenCalledWith("device-a", 7);
  });
});
