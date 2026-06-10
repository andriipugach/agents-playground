import { http, HttpResponse } from "msw";
import { ZodError } from "zod";
import { beforeEach, describe, expect, test } from "vitest";
import { normalizeWeather, toIconUrl } from "@/lib/openweather";
import { fetchWeatherByCity } from "@/lib/weather-service";
import { server } from "@/tests/msw/server";
import { citySearchHandlers } from "@/tests/msw/city-search-handlers";
import {
  SUCCESS_CITIES,
  makeCurrentByCity,
  makeForecastByCity,
  referenceCurrent,
  referenceForecast,
  resolveDeniedCity,
} from "@/tests/msw/openweather-fixtures";

describe("normalizeWeather (pure parser)", () => {
  test("happy path: maps raw payloads to the domain snapshot", () => {
    const result = normalizeWeather(referenceCurrent, referenceForecast);

    expect(result.city).toBe("Kyiv");
    expect(result.country).toBe("UA");
    expect(result.current).toEqual({
      temperatureC: 22.5,
      description: "clear sky",
      humidity: 40,
      windSpeed: 3.2,
      iconUrl: toIconUrl("01d"),
    });
    expect(result.forecast).toHaveLength(5);
    expect(result.forecast[0]).toEqual({
      date: "2026-06-04",
      temperatureC: 21.2,
      description: "few clouds",
      iconUrl: toIconUrl("02d"),
    });
  });

  test("de-duplicates forecast entries to one per day, capped at 5 days", () => {
    const forecast = makeForecastByCity("Kyiv");
    expect(forecast.list.length).toBeGreaterThan(3);

    const result = normalizeWeather(referenceCurrent, forecast);

    expect(result.forecast).toHaveLength(5);
    expect(result.forecast.map((day) => day.date)).toEqual([
      "2026-06-04",
      "2026-06-05",
      "2026-06-06",
      "2026-06-07",
      "2026-06-08",
    ]);
  });

  test("missing fields: throws ZodError when a required key is absent", () => {
    const broken = structuredClone(referenceCurrent) as Record<string, unknown>;
    delete broken.main;

    expect(() => normalizeWeather(broken, referenceForecast)).toThrow(ZodError);
  });

  test("missing fields: throws ZodError when forecast list is malformed", () => {
    const broken = { list: [{ dt_txt: "2026-06-04 12:00:00" }] };

    expect(() => normalizeWeather(referenceCurrent, broken)).toThrow(ZodError);
  });
});

describe("seeded mock generator (deterministic 'random' values)", () => {
  test("produces the same payload for the same city across runs", () => {
    expect(makeCurrentByCity("Kyiv")).toEqual(makeCurrentByCity("Kyiv"));
    expect(makeForecastByCity("Tokyo")).toEqual(makeForecastByCity("Tokyo"));
  });

  test("produces different payloads for different cities", () => {
    expect(makeCurrentByCity("Kyiv")).not.toEqual(makeCurrentByCity("Tokyo"));
  });

  test("resolveDeniedCity is case-insensitive and trims input", () => {
    expect(resolveDeniedCity("  kyiv ")).toBe("Kyiv");
    expect(resolveDeniedCity("Kyiv")).toBeUndefined();
    expect(resolveDeniedCity(null)).toBeUndefined();
  });
});

describe("fetchWeatherByCity with denylist handlers (e2e via MSW)", () => {
  beforeEach(() => {
    server.use(...citySearchHandlers);
  });

  test.each(SUCCESS_CITIES)("returns randomized weather for %s", async (city) => {
    const result = await fetchWeatherByCity(city);

    expect(result.city).toBe(city);
    expect(typeof result.current.temperatureC).toBe("number");
    expect(typeof result.current.humidity).toBe("number");
    expect(typeof result.current.windSpeed).toBe("number");
    expect(result.current.iconUrl).toMatch(/openweathermap\.org/);
    expect(result.forecast).toHaveLength(5);
  });

  test("Moscow is denylisted: rejects with not-found error", async () => {
    await expect(fetchWeatherByCity("Moscow")).rejects.toThrow("City not found");
  });

  test("server error (500): rejects with the service fallback message", async () => {
    server.use(
      http.get("https://api.openweathermap.org/data/2.5/forecast", () =>
        HttpResponse.json({ message: "down" }, { status: 500 }),
      ),
    );

    await expect(fetchWeatherByCity("Kyiv")).rejects.toThrow(
      "Unable to fetch weather data right now",
    );
  });
});
