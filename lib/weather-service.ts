import { z } from "zod";
import type { WeatherSnapshot } from "@/lib/types";

const weatherResponseSchema = z.object({
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

const forecastResponseSchema = z.object({
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

const toIconUrl = (iconCode: string): string =>
  `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

const getApiKey = (): string => process.env.OPENWEATHER_API_KEY ?? "test-api-key";

const getWeatherErrorMessage = (status: number): string => {
  if (status === 404) {
    return "City not found";
  }

  return "Unable to fetch weather data right now";
};

export const fetchWeatherByCity = async (city: string): Promise<WeatherSnapshot> => {
  const normalizedCity = city.trim();
  if (!normalizedCity) {
    throw new Error("City is required");
  }

  const encodedCity = encodeURIComponent(normalizedCity);
  const apiKey = getApiKey();

  const [currentResponse, forecastResponse] = await Promise.all([
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodedCity}&appid=${apiKey}&units=metric`,
    ),
    fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${encodedCity}&appid=${apiKey}&units=metric`,
    ),
  ]);

  if (!currentResponse.ok) {
    throw new Error(getWeatherErrorMessage(currentResponse.status));
  }

  if (!forecastResponse.ok) {
    throw new Error(getWeatherErrorMessage(forecastResponse.status));
  }

  const currentPayload = weatherResponseSchema.parse(await currentResponse.json());
  const forecastPayload = forecastResponseSchema.parse(await forecastResponse.json());

  const forecast = forecastPayload.list
    .map((entry) => ({
      date: entry.dt_txt.slice(0, 10),
      temperatureC: entry.main.temp,
      description: entry.weather[0].description,
      iconUrl: toIconUrl(entry.weather[0].icon),
    }))
    .filter((entry, index, all) => all.findIndex((item) => item.date === entry.date) === index)
    .slice(0, 3);

  return {
    city: currentPayload.name,
    country: currentPayload.sys.country,
    current: {
      temperatureC: currentPayload.main.temp,
      description: currentPayload.weather[0].description,
      humidity: currentPayload.main.humidity,
      windSpeed: currentPayload.wind.speed,
      iconUrl: toIconUrl(currentPayload.weather[0].icon),
    },
    forecast,
  };
};
