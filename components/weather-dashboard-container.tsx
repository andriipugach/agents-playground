"use client";

import { useCallback, useEffect, useState } from "react";
import { WeatherDashboard } from "@/components/weather-dashboard";
import type { FavoriteCity, WeatherSnapshot } from "@/lib/types";

const FALLBACK_ERROR = "Unable to reach the server. Please try again.";

const toErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
};

export const WeatherDashboardContainer = () => {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [favorites, setFavorites] = useState<FavoriteCity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const loadWeatherFromUrl = useCallback(async (url: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        setError(await toErrorMessage(response));
        return null;
      }

      setError(null);
      const snapshot = (await response.json()) as WeatherSnapshot;
      setWeather(snapshot);
      return snapshot;
    } catch {
      setError(FALLBACK_ERROR);
      return null;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const response = await fetch("/api/favorites");
      if (!response.ok) {
        setError(await toErrorMessage(response));
        return null;
      }

      const nextFavorites = (await response.json()) as FavoriteCity[];
      setFavorites(nextFavorites);
      return nextFavorites;
    } catch {
      setError(FALLBACK_ERROR);
      return null;
    }
  }, []);

  const loadWeatherForLocation = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const { latitude, longitude } = position.coords;

      await loadWeatherFromUrl(`/api/weather/location?lat=${latitude}&lon=${longitude}`);
    } catch {
      setError("Unable to load weather for your current location.");
    }
  }, [loadWeatherFromUrl]);

  useEffect(() => {
    const initializeDashboard = async () => {
      const initialFavorites = await loadFavorites();
      if (initialFavorites === null) {
        return;
      }

      const firstFavorite = initialFavorites[0];
      if (firstFavorite) {
        await loadWeatherFromUrl(`/api/weather?city=${encodeURIComponent(firstFavorite.city)}`);
        return;
      }

      await loadWeatherForLocation();
    };

    void initializeDashboard();
  }, [loadFavorites, loadWeatherForLocation, loadWeatherFromUrl]);

  const onSearch = async (city: string) => {
    await loadWeatherFromUrl(`/api/weather?city=${encodeURIComponent(city)}`);
  };

  const onAddFavorite = async (city: string) => {
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ city }),
      });

      if (!response.ok) {
        setError(await toErrorMessage(response));
        return;
      }

      setError(null);
      await loadFavorites();
    } catch {
      setError(FALLBACK_ERROR);
    }
  };

  const onRemoveFavorite = async (id: number) => {
    try {
      const response = await fetch(`/api/favorites/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setError(await toErrorMessage(response));
        return;
      }

      setError(null);
      await loadFavorites();
    } catch {
      setError(FALLBACK_ERROR);
    }
  };

  return (
    <WeatherDashboard
      weather={weather}
      favorites={favorites}
      error={error}
      isSearching={isSearching}
      onSearch={onSearch}
      onAddFavorite={onAddFavorite}
      onRemoveFavorite={onRemoveFavorite}
    />
  );
};
