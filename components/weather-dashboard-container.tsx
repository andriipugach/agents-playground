"use client";

import { useEffect, useState } from "react";
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

  const loadFavorites = async () => {
    try {
      const response = await fetch("/api/favorites");
      if (!response.ok) {
        setError(await toErrorMessage(response));
        return;
      }

      setFavorites((await response.json()) as FavoriteCity[]);
    } catch {
      setError(FALLBACK_ERROR);
    }
  };

  useEffect(() => {
    // Initial sync on mount; updates occur after async fetch completion.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFavorites();
  }, []);

  const onSearch = async (city: string) => {
    setIsSearching(true);
    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
      if (!response.ok) {
        setError(await toErrorMessage(response));
        return;
      }

      setError(null);
      setWeather((await response.json()) as WeatherSnapshot);
    } catch {
      setError(FALLBACK_ERROR);
    } finally {
      setIsSearching(false);
    }
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
