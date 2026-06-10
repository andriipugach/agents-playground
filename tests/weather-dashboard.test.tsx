import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { cloneElement } from "react";
import { describe, expect, test, vi } from "vitest";
import { WeatherDashboard } from "@/components/weather-dashboard";
import type { WeatherSnapshot } from "@/lib/types";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: ReactElement<{ width?: number; height?: number }>;
    }) => cloneElement(children, { width: 320, height: 200 }),
  };
});

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
    {
      date: "2026-06-07",
      temperatureC: 18.4,
      description: "overcast clouds",
      iconUrl: "https://openweathermap.org/img/wn/04d@2x.png",
    },
    {
      date: "2026-06-08",
      temperatureC: 23.6,
      description: "moderate rain",
      iconUrl: "https://openweathermap.org/img/wn/10d@2x.png",
    },
  ],
};

describe("WeatherDashboard", () => {
  test("searches by city and renders refreshed weather insights", async () => {
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
        isSearching={false}
      />,
    );

    await user.type(screen.getByLabelText("City"), "Kyiv");
    await user.click(screen.getByRole("button", { name: "Search weather" }));

    expect(onSearch).toHaveBeenCalledWith("Kyiv");
    expect(screen.getByRole("heading", { name: "Weather Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Current conditions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Forecast insights" })).toBeInTheDocument();
    expect(screen.getByText("London, GB")).toBeInTheDocument();
    expect(screen.getByLabelText("5-day temperature trend")).toBeInTheDocument();
  });

  test("renders condition and forecast weather icons from icon urls", () => {
    render(
      <WeatherDashboard
        weather={weather}
        favorites={[]}
        onSearch={vi.fn()}
        onAddFavorite={vi.fn()}
        onRemoveFavorite={vi.fn()}
        error={null}
        isSearching={false}
      />,
    );

    expect(screen.getByAltText("clear sky")).toHaveAttribute(
      "src",
      "https://openweathermap.org/img/wn/01d@2x.png",
    );
    expect(screen.getByAltText("few clouds")).toHaveAttribute(
      "src",
      "https://openweathermap.org/img/wn/02d@2x.png",
    );
    expect(screen.getByAltText("light rain")).toBeInTheDocument();
    expect(screen.getByAltText("scattered clouds")).toBeInTheDocument();
    expect(screen.getByAltText("overcast clouds")).toBeInTheDocument();
    expect(screen.getByAltText("moderate rain")).toBeInTheDocument();
  });

  test("disables the search button while a search is in progress", () => {
    render(
      <WeatherDashboard
        weather={null}
        favorites={[]}
        onSearch={vi.fn()}
        onAddFavorite={vi.fn()}
        onRemoveFavorite={vi.fn()}
        error={null}
        isSearching={true}
      />,
    );

    expect(screen.getByRole("button", { name: "Searching..." })).toBeDisabled();
  });

  test("shows an inviting empty state and no forecast card without weather", () => {
    render(
      <WeatherDashboard
        weather={null}
        favorites={[]}
        onSearch={vi.fn()}
        onAddFavorite={vi.fn()}
        onRemoveFavorite={vi.fn()}
        error={null}
        isSearching={false}
      />,
    );

    expect(screen.getByTestId("weather-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("forecast-card")).not.toBeInTheDocument();
    expect(screen.getByText("No favorite cities yet.")).toBeInTheDocument();
  });

  test("renders the error banner with an alert role", () => {
    render(
      <WeatherDashboard
        weather={null}
        favorites={[]}
        onSearch={vi.fn()}
        onAddFavorite={vi.fn()}
        onRemoveFavorite={vi.fn()}
        error={"City not found"}
        isSearching={false}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("City not found");
  });

  test("keeps favorites and add actions wired in refreshed UI", async () => {
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
        isSearching={false}
      />,
    );

    expect(screen.queryByText("Load")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add to favorites" }));
    await user.click(screen.getByRole("button", { name: "Load Paris weather" }));
    await user.click(screen.getByRole("button", { name: "Remove Paris from favorites" }));

    expect(onAddFavorite).toHaveBeenCalledWith("London");
    expect(onSearch).toHaveBeenCalledWith("Paris");
    expect(onRemoveFavorite).toHaveBeenCalledWith(10);
  });

  test("highlights the favorite that matches the loaded city as active", () => {
    render(
      <WeatherDashboard
        weather={weather}
        favorites={[
          { id: 1, city: "London", createdAt: "2026-06-03T10:00:00.000Z" },
          { id: 2, city: "Paris", createdAt: "2026-06-03T10:00:00.000Z" },
        ]}
        onSearch={vi.fn()}
        onAddFavorite={vi.fn()}
        onRemoveFavorite={vi.fn()}
        error={null}
        isSearching={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Load London weather", current: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Load Paris weather", current: false }),
    ).toBeInTheDocument();
  });
});
