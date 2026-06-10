import { z } from "zod";
import type { WeatherSnapshot } from "@/lib/types";

export const currentWeatherSchema = z.object({
  weather: z.array(z.object({ description: z.string(), icon: z.string() })).min(1),
  main: z.object({
    temp: z.number(),
    humidity: z.number(),
  }),
  wind: z.object({
    speed: z.number(),
  }),
  name: z.string(),
  sys: z.object({
    country: z.string(),
  }),
});

export const forecastSchema = z.object({
  list: z.array(
    z.object({
      dt_txt: z.string(),
      main: z.object({
        temp: z.number(),
      }),
      weather: z.array(z.object({ description: z.string(), icon: z.string() })).min(1),
    }),
  ),
});

export type CurrentWeatherPayload = z.infer<typeof currentWeatherSchema>;
export type ForecastPayload = z.infer<typeof forecastSchema>;

export const toIconUrl = (iconCode: string): string =>
  `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

/**
 * Pure parser/normalizer. Validates raw OpenWeatherMap payloads and maps them
 * to the app's domain type. Throws a ZodError on missing/malformed fields, so
 * malformed-payload behavior can be tested without any network/MSW layer.
 */
export const normalizeWeather = (currentRaw: unknown, forecastRaw: unknown): WeatherSnapshot => {
  const current = currentWeatherSchema.parse(currentRaw);
  const forecastPayload = forecastSchema.parse(forecastRaw);

  const forecast = forecastPayload.list
    .map((entry) => ({
      date: entry.dt_txt.slice(0, 10),
      temperatureC: entry.main.temp,
      description: entry.weather[0].description,
      iconUrl: toIconUrl(entry.weather[0].icon),
    }))
    .filter((entry, index, all) => all.findIndex((item) => item.date === entry.date) === index)
    .slice(0, 5);

  return {
    city: current.name,
    country: current.sys.country,
    current: {
      temperatureC: current.main.temp,
      description: current.weather[0].description,
      humidity: current.main.humidity,
      windSpeed: current.wind.speed,
      iconUrl: toIconUrl(current.weather[0].icon),
    },
    forecast,
  };
};
