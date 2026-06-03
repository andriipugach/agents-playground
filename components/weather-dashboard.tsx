"use client";

/* eslint-disable @next/next/no-img-element -- weather icons are remote OpenWeatherMap CDN assets; next/image adds no value and would rewrite the asserted src. */

import { useState, type FormEvent } from "react";
import { Button } from "@base-ui/react/button";
import { Field } from "@base-ui/react/field";
import { Meter } from "@base-ui/react/meter";
import { ScrollArea } from "@base-ui/react/scroll-area";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FavoriteCity, WeatherSnapshot } from "@/lib/types";

type WeatherDashboardProps = {
  weather: WeatherSnapshot | null;
  favorites: FavoriteCity[];
  error: string | null;
  isSearching: boolean;
  onSearch: (city: string) => Promise<void>;
  onAddFavorite: (city: string) => Promise<void>;
  onRemoveFavorite: (id: number) => Promise<void>;
};

const WIND_SCALE_MAX = 20;

const formatTemp = (value: number) => `${Math.round(value)}°`;

const formatDayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
  });

const formatDayDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

export const WeatherDashboard = ({
  weather,
  favorites,
  error,
  isSearching,
  onSearch,
  onAddFavorite,
  onRemoveFavorite,
}: WeatherDashboardProps) => {
  const [city, setCity] = useState("");

  const submitSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSearch(city);
  };

  const chartData =
    weather?.forecast.map((day) => ({
      label: formatDayLabel(day.date),
      temp: Math.round(day.temperatureC * 10) / 10,
    })) ?? [];

  return (
    <main className="dashboard">
      <header className="weather-hero" data-testid="weather-hero">
        <div className="hero-copy">
          <p className="hero-eyebrow">Live conditions &amp; forecast</p>
          <h1>Weather Dashboard</h1>
          <p className="hero-sub">
            Search any city to see current weather, a 3-day trend, and save your favorites.
          </p>
        </div>

        <form className="hero-search" onSubmit={submitSearch}>
          <Field.Root className="hero-field">
            <Field.Label className="hero-label">City</Field.Label>
            <Field.Control
              className="hero-input"
              placeholder="Try “Kyiv”, “London”, “Tokyo”…"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </Field.Root>
          <Button type="submit" className="hero-button" disabled={isSearching}>
            {isSearching ? "Searching..." : "Search weather"}
          </Button>
        </form>
      </header>

      {error ? (
        <p role="alert" className="error-banner">
          {error}
        </p>
      ) : null}

      <div className="dashboard-grid">
        <div className="main-column">
          {weather ? (
            <>
              <section className="weather-card current-card" aria-labelledby="current-heading">
                <header className="card-head">
                  <div>
                    <h2 id="current-heading">Current conditions</h2>
                    <p className="place">
                      {weather.city}, {weather.country}
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="ghost-button"
                    onClick={() => onAddFavorite(weather.city)}
                  >
                    Add to favorites
                  </Button>
                </header>

                <div className="current-body">
                  <div className="current-headline">
                    <img
                      className="condition-icon"
                      src={weather.current.iconUrl}
                      alt={weather.current.description}
                      width={96}
                      height={96}
                    />
                    <div className="current-readout">
                      <span className="temp-value">{formatTemp(weather.current.temperatureC)}</span>
                      <span className="condition-text">{weather.current.description}</span>
                    </div>
                  </div>

                  <div className="metrics">
                    <Meter.Root
                      className="metric"
                      value={weather.current.humidity}
                      aria-label="Humidity"
                    >
                      <div className="metric-head">
                        <Meter.Label className="metric-label">Humidity</Meter.Label>
                        <span className="metric-value">{weather.current.humidity}%</span>
                      </div>
                      <Meter.Track className="metric-track">
                        <Meter.Indicator className="metric-indicator metric-indicator--humidity" />
                      </Meter.Track>
                    </Meter.Root>

                    <Meter.Root
                      className="metric"
                      value={weather.current.windSpeed}
                      max={WIND_SCALE_MAX}
                      aria-label="Wind"
                    >
                      <div className="metric-head">
                        <Meter.Label className="metric-label">Wind</Meter.Label>
                        <span className="metric-value">{weather.current.windSpeed} m/s</span>
                      </div>
                      <Meter.Track className="metric-track">
                        <Meter.Indicator className="metric-indicator metric-indicator--wind" />
                      </Meter.Track>
                    </Meter.Root>
                  </div>
                </div>
              </section>

              <section
                className="weather-card forecast-card"
                data-testid="forecast-card"
                aria-labelledby="forecast-heading"
              >
                <header className="card-head">
                  <h2 id="forecast-heading">Forecast insights</h2>
                  <span className="card-hint">Next 3 days</span>
                </header>

                <div className="forecast-chart" role="img" aria-label="3-day temperature trend">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart
                      data={chartData}
                      margin={{ top: 12, right: 16, bottom: 0, left: -12 }}
                    >
                      <defs>
                        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#5a67ff" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="4 6"
                        stroke="rgba(124, 58, 237, 0.12)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64708f", fontSize: 12 }}
                      />
                      <YAxis
                        width={42}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#64708f", fontSize: 12 }}
                        tickFormatter={(value: number) => `${value}°`}
                      />
                      <Tooltip
                        cursor={{ stroke: "#7c3aed", strokeWidth: 1, strokeDasharray: "3 3" }}
                        formatter={(value) => [`${value}°C`, "Temp"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="temp"
                        stroke="#6d28d9"
                        strokeWidth={3}
                        fill="url(#tempGradient)"
                        dot={{ r: 4, fill: "#6d28d9", strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <ul className="forecast-days">
                  {weather.forecast.map((day) => (
                    <li key={day.date} className="forecast-day">
                      <span className="day-label">{formatDayLabel(day.date)}</span>
                      <span className="day-date">{formatDayDate(day.date)}</span>
                      <img
                        className="day-icon"
                        src={day.iconUrl}
                        alt={day.description}
                        width={56}
                        height={56}
                      />
                      <span className="day-temp">{formatTemp(day.temperatureC)}</span>
                      <span className="day-desc">{day.description}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : (
            <section className="weather-card empty-card" data-testid="weather-empty">
              <span className="empty-glyph" aria-hidden="true">
                ⛅
              </span>
              <h2>Find your city</h2>
              <p className="muted">
                Search for a city above to see current conditions and a 3-day forecast.
              </p>
            </section>
          )}
        </div>

        <aside className="side-column">
          <section className="weather-card favorites-card" aria-labelledby="favorites-heading">
            <header className="card-head">
              <h2 id="favorites-heading">Favorites</h2>
              <span className="card-hint">{favorites.length}</span>
            </header>

            {favorites.length === 0 ? (
              <p className="muted">No favorite cities yet.</p>
            ) : (
              <ScrollArea.Root className="favorites-scroll">
                <ScrollArea.Viewport className="favorites-viewport">
                  <ul className="favorites-list">
                    {favorites.map((favorite) => {
                      const isActive = weather?.city.toLowerCase() === favorite.city.toLowerCase();

                      return (
                        <li
                          key={favorite.id}
                          className="favorite-item"
                          data-active={isActive ? "true" : undefined}
                        >
                          <Button
                            type="button"
                            className="favorite-card"
                            aria-label={`Load ${favorite.city} weather`}
                            aria-current={isActive ? "true" : undefined}
                            onClick={() => onSearch(favorite.city)}
                          >
                            <span className="favorite-name">{favorite.city}</span>
                          </Button>
                          <Button
                            type="button"
                            className="favorite-remove"
                            aria-label={`Remove ${favorite.city} from favorites`}
                            onClick={() => onRemoveFavorite(favorite.id)}
                          >
                            <svg
                              className="favorite-remove-icon"
                              viewBox="0 0 24 24"
                              width="16"
                              height="16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              aria-hidden="true"
                              focusable="false"
                            >
                              <path d="M6 6l12 12M18 6L6 18" />
                            </svg>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar className="favorites-scrollbar" orientation="vertical">
                  <ScrollArea.Thumb className="favorites-thumb" />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
};
