import { beforeEach, describe, expect, test, vi } from "vitest";
import type { WeatherSnapshot } from "@/lib/types";

const fetchWeatherByCityMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  loadedCity: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/weather-service", () => ({
  fetchWeatherByCity: fetchWeatherByCityMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { GET } from "@/app/api/weather/route";

const weatherSnapshot: WeatherSnapshot = {
  city: "Kyiv",
  country: "UA",
  current: {
    temperatureC: 21,
    description: "clear sky",
    humidity: 40,
    windSpeed: 5,
    iconUrl: "https://example.com/icon.png",
  },
  forecast: [],
};

describe("weather route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("records each successful city search for the current device", async () => {
    fetchWeatherByCityMock.mockResolvedValueOnce(weatherSnapshot);

    const response = await GET(
      new Request("https://example.com/api/weather?city=kyiv", {
        headers: { cookie: "deviceId=device-a" },
      }),
    );

    await expect(response.json()).resolves.toEqual(weatherSnapshot);
    expect(prismaMock.loadedCity.create).toHaveBeenCalledWith({
      data: {
        city: "Kyiv",
        country: "UA",
        device: {
          connectOrCreate: {
            where: { id: "device-a" },
            create: { id: "device-a" },
          },
        },
      },
    });
  });

  test("does not record failed city searches", async () => {
    fetchWeatherByCityMock.mockRejectedValueOnce(new Error("City not found"));

    const response = await GET(
      new Request("https://example.com/api/weather?city=unknown", {
        headers: { cookie: "deviceId=device-a" },
      }),
    );

    expect(response.status).toBe(404);
    expect(prismaMock.loadedCity.create).not.toHaveBeenCalled();
  });
});
