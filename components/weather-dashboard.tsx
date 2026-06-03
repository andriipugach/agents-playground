"use client";

import { useState, type FormEvent } from "react";
import type { FavoriteCity, WeatherSnapshot } from "@/lib/types";

type WeatherDashboardProps = {
  weather: WeatherSnapshot | null;
  favorites: FavoriteCity[];
  error: string | null;
  onSearch: (city: string) => Promise<void>;
  onAddFavorite: (city: string) => Promise<void>;
  onRemoveFavorite: (id: number) => Promise<void>;
};

export const WeatherDashboard = ({
  weather,
  favorites,
  error,
  onSearch,
  onAddFavorite,
  onRemoveFavorite,
}: WeatherDashboardProps) => {
  const [city, setCity] = useState("");

  const submitSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSearch(city);
  };

  return (
    <main className="container">
      <h1>Weather Dashboard</h1>

      <form onSubmit={submitSearch} className="search-row">
        <label htmlFor="city">City</label>
        <input
          id="city"
          name="city"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Search city"
        />
        <button type="submit">Search</button>
      </form>

      {error ? <p role="alert">{error}</p> : null}

      {weather ? (
        <section className="panel">
          <header className="panel-header">
            <h2>
              {weather.city}, {weather.country}
            </h2>
            <button type="button" onClick={() => onAddFavorite(weather.city)}>
              Add to favorites
            </button>
          </header>
          <p>{weather.current.description}</p>
          <p>Temperature: {weather.current.temperatureC} C</p>
          <p>Humidity: {weather.current.humidity}%</p>
          <p>Wind: {weather.current.windSpeed} m/s</p>
          <h3>3-day forecast</h3>
          <ul className="forecast-list">
            {weather.forecast.map((day) => (
              <li key={day.date}>
                <strong>{day.date}</strong> - {day.description} ({day.temperatureC} C)
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p>Search for a city to see weather details.</p>
      )}

      <section className="panel">
        <h3>Favorites</h3>
        {favorites.length === 0 ? <p>No favorite cities yet.</p> : null}
        <ul className="favorites-list">
          {favorites.map((favorite) => (
            <li key={favorite.id}>
              <span>{favorite.city}</span>
              <button type="button" onClick={() => onSearch(favorite.city)}>
                Load
              </button>
              <button type="button" onClick={() => onRemoveFavorite(favorite.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};
