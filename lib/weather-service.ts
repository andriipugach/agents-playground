import type { WeatherSnapshot } from "@/lib/types";
import { normalizeWeather } from "@/lib/openweather";

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

  return normalizeWeather(await currentResponse.json(), await forecastResponse.json());
};

export const fetchWeatherByCoordinates = async (
  latitude: number,
  longitude: number,
): Promise<WeatherSnapshot> => {
  const apiKey = getApiKey();

  const [currentResponse, forecastResponse] = await Promise.all([
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`,
    ),
    fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`,
    ),
  ]);

  if (!currentResponse.ok) {
    throw new Error(getWeatherErrorMessage(currentResponse.status));
  }

  if (!forecastResponse.ok) {
    throw new Error(getWeatherErrorMessage(forecastResponse.status));
  }

  return normalizeWeather(await currentResponse.json(), await forecastResponse.json());
};
