import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { WeatherDashboard } from "@/components/weather-dashboard";
import type { WeatherSnapshot } from "@/lib/types";

const weather: WeatherSnapshot = {
  city: "London",
  country: "GB",
  current: {
    temperatureC: 22.5,
    description: "clear sky",
    humidity: 40,
    windSpeed: 3.2,
    iconUrl: "https://openweathermap.org/img/wn/01d@2x.png",
  },
  forecast: [
    {
      date: "2026-06-04",
      temperatureC: 21.2,
      description: "few clouds",
      iconUrl: "https://openweathermap.org/img/wn/02d@2x.png",
    },
    {
      date: "2026-06-05",
      temperatureC: 20.1,
      description: "light rain",
      iconUrl: "https://openweathermap.org/img/wn/10d@2x.png",
    },
    {
      date: "2026-06-06",
      temperatureC: 19.3,
      description: "scattered clouds",
      iconUrl: "https://openweathermap.org/img/wn/03d@2x.png",
    },
  ],
};

describe("WeatherDashboard", () => {
  test("searches by city and renders weather cards", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn().mockResolvedValue(undefined);

    render(
      <WeatherDashboard
        weather={weather}
        favorites={[]}
        onSearch={onSearch}
        onAddFavorite={vi.fn()}
        onRemoveFavorite={vi.fn()}
        error={null}
      />,
    );

    await user.type(screen.getByLabelText("City"), "Kyiv");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith("Kyiv");
    expect(screen.getByText("London, GB")).toBeInTheDocument();
    expect(screen.getByText("3-day forecast")).toBeInTheDocument();
  });

  test("handles favorites actions and add favorite interaction", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn().mockResolvedValue(undefined);
    const onAddFavorite = vi.fn().mockResolvedValue(undefined);
    const onRemoveFavorite = vi.fn().mockResolvedValue(undefined);

    render(
      <WeatherDashboard
        weather={weather}
        favorites={[{ id: 10, city: "Paris", createdAt: "2026-06-03T10:00:00.000Z" }]}
        onSearch={onSearch}
        onAddFavorite={onAddFavorite}
        onRemoveFavorite={onRemoveFavorite}
        error={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add to favorites" }));
    await user.click(screen.getByRole("button", { name: "Load" }));
    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(onAddFavorite).toHaveBeenCalledWith("London");
    expect(onSearch).toHaveBeenCalledWith("Paris");
    expect(onRemoveFavorite).toHaveBeenCalledWith(10);
  });
});
