import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import { fetchWeatherByCity, fetchWeatherByCoordinates } from "@/lib/weather-service";
import { server } from "@/tests/msw/server";

describe("fetchWeatherByCity", () => {
  test("returns normalized current weather and 5-day forecast", async () => {
    const result = await fetchWeatherByCity("London");

    expect(result.city).toBe("London");
    expect(result.country).toBe("GB");
    expect(result.current.temperatureC).toBe(22.5);
    expect(result.forecast).toHaveLength(5);
    expect(result.forecast[0].date).toBe("2026-06-04");
  });

  test("throws a user-safe not found error for unknown city", async () => {
    await expect(fetchWeatherByCity("unknown")).rejects.toThrow("City not found");
  });

  test("throws when city is empty", async () => {
    await expect(fetchWeatherByCity("   ")).rejects.toThrow("City is required");
  });

  test("throws fallback message when forecast endpoint fails", async () => {
    server.use(
      http.get("https://api.openweathermap.org/data/2.5/forecast", () =>
        HttpResponse.json({ message: "down" }, { status: 500 }),
      ),
    );
    await expect(fetchWeatherByCity("London")).rejects.toThrow(
      "Unable to fetch weather data right now",
    );
  });
});

describe("fetchWeatherByCoordinates", () => {
  test("returns normalized current weather and 5-day forecast for coordinates", async () => {
    const result = await fetchWeatherByCoordinates(51.51, -0.13);

    expect(result.city).toBe("London");
    expect(result.country).toBe("GB");
    expect(result.forecast).toHaveLength(5);
  });
});
