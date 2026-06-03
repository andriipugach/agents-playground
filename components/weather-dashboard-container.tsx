"use client";

import { useEffect, useState } from "react";
import { WeatherDashboard } from "@/components/weather-dashboard";
import type { FavoriteCity, WeatherSnapshot } from "@/lib/types";

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

  const loadFavorites = async () => {
    const response = await fetch("/api/favorites");
    if (!response.ok) {
      setError(await toErrorMessage(response));
      return;
    }

    setFavorites((await response.json()) as FavoriteCity[]);
  };

  useEffect(() => {
    void loadFavorites();
  }, []);

  const onSearch = async (city: string) => {
    const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    if (!response.ok) {
      setError(await toErrorMessage(response));
      return;
    }

    setError(null);
    setWeather((await response.json()) as WeatherSnapshot);
  };

  const onAddFavorite = async (city: string) => {
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
  };

  const onRemoveFavorite = async (id: number) => {
    const response = await fetch(`/api/favorites/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError(await toErrorMessage(response));
      return;
    }

    setError(null);
    await loadFavorites();
  };

  return <WeatherDashboard weather={weather} favorites={favorites} error={error} onSearch={onSearch} onAddFavorite={onAddFavorite} onRemoveFavorite={onRemoveFavorite} />;
};
