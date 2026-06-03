import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { WeatherDashboardContainer } from "@/components/weather-dashboard-container";
import type { FavoriteCity, WeatherSnapshot } from "@/lib/types";

type WeatherDashboardProps = {
  weather: WeatherSnapshot | null;
  favorites: FavoriteCity[];
  isSearching: boolean;
  error: string | null;
  onSearch: (city: string) => Promise<void>;
  onAddFavorite: (city: string) => Promise<void>;
  onRemoveFavorite: (id: number) => Promise<void>;
};

const renderDashboardMock = vi.fn<(props: WeatherDashboardProps) => void>();
const FALLBACK_ERROR = "Unable to reach the server. Please try again.";
const API_ERROR = "API request failed";

const weatherSnapshot: WeatherSnapshot = {
  city: "Kyiv",
  country: "UA",
  current: {
    temperatureC: 21,
    description: "clear sky",
    humidity: 40,
    windSpeed: 5,
    iconUrl: "https://example.com/icon.png",
  },
  forecast: [
    {
      date: "2026-06-04",
      temperatureC: 20,
      description: "few clouds",
      iconUrl: "https://example.com/01.png",
    },
    {
      date: "2026-06-05",
      temperatureC: 19,
      description: "light rain",
      iconUrl: "https://example.com/02.png",
    },
    {
      date: "2026-06-06",
      temperatureC: 18,
      description: "clear",
      iconUrl: "https://example.com/03.png",
    },
  ],
};

vi.mock("@/components/weather-dashboard", () => ({
  WeatherDashboard: (props: WeatherDashboardProps) => {
    renderDashboardMock(props);
    return <div data-testid="weather-dashboard-mock" />;
  },
}));

const getLatestProps = () => {
  const latestCall = renderDashboardMock.mock.lastCall;
  if (!latestCall) {
    throw new Error("Expected WeatherDashboard to be rendered");
  }

  return latestCall[0];
};

const jsonResponse = (payload: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

describe("WeatherDashboardContainer", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderDashboardMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("loadFavorites shows fallback error when initial fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));

    render(<WeatherDashboardContainer />);

    await waitFor(() => {
      expect(getLatestProps().error).toBe(FALLBACK_ERROR);
    });
  });

  test("loadFavorites sets API message when initial response is not ok", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: API_ERROR }, { status: 500, statusText: "Server Error" }),
    );

    render(<WeatherDashboardContainer />);

    await waitFor(() => {
      expect(getLatestProps().error).toBe(API_ERROR);
    });
  });

  test("onSearch shows fallback error when fetch rejects", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockRejectedValueOnce(new Error("network"));

    render(<WeatherDashboardContainer />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/favorites");
    });

    await act(async () => {
      await getLatestProps().onSearch("Kyiv");
    });

    await waitFor(() => {
      expect(getLatestProps().error).toBe(FALLBACK_ERROR);
      expect(getLatestProps().isSearching).toBe(false);
    });
  });

  test("onSearch sets API message when response is not ok", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: API_ERROR }, { status: 500, statusText: "Server Error" }),
    );

    render(<WeatherDashboardContainer />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/favorites");
    });

    await act(async () => {
      await getLatestProps().onSearch("Kyiv");
    });

    await waitFor(() => {
      expect(getLatestProps().error).toBe(API_ERROR);
      expect(getLatestProps().isSearching).toBe(false);
    });
  });

  test("onSearch falls back to default message when error payload is invalid", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(new Response("invalid-json", { status: 500 }));

    render(<WeatherDashboardContainer />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/favorites");
    });

    await act(async () => {
      await getLatestProps().onSearch("Kyiv");
    });

    await waitFor(() => {
      expect(getLatestProps().error).toBe("Request failed");
      expect(getLatestProps().isSearching).toBe(false);
    });
  });

  test("onSearch updates weather when response is ok", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse(weatherSnapshot));

    render(<WeatherDashboardContainer />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/favorites");
    });

    await act(async () => {
      await getLatestProps().onSearch("Kyiv");
    });

    await waitFor(() => {
      expect(getLatestProps().weather).toEqual(weatherSnapshot);
      expect(getLatestProps().error).toBeNull();
      expect(getLatestProps().isSearching).toBe(false);
    });
  });

  test("onAddFavorite shows fallback error when fetch rejects", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockRejectedValueOnce(new Error("network"));

    render(<WeatherDashboardContainer />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/favorites");
    });

    await act(async () => {
      await getLatestProps().onAddFavorite("Kyiv");
    });

    await waitFor(() => {
      expect(getLatestProps().error).toBe(FALLBACK_ERROR);
    });
  });

  test("onAddFavorite sets API message when response is not ok", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: API_ERROR }, { status: 400, statusText: "Bad Request" }),
    );

    render(<WeatherDashboardContainer />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/favorites");
    });

    await act(async () => {
      await getLatestProps().onAddFavorite("Kyiv");
    });

    await waitFor(() => {
      expect(getLatestProps().error).toBe(API_ERROR);
    });
  });

  test("onAddFavorite refreshes favorites when response is ok", async () => {
    const favorite = { id: 11, city: "Kyiv", createdAt: "2026-06-03T00:00:00.000Z" };

    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    fetchMock.mockResolvedValueOnce(jsonResponse([favorite]));

    render(<WeatherDashboardContainer />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/favorites");
    });

    await act(async () => {
      await getLatestProps().onAddFavorite("Kyiv");
    });

    await waitFor(() => {
      expect(getLatestProps().favorites).toEqual([favorite]);
      expect(getLatestProps().error).toBeNull();
    });
  });

  test("onRemoveFavorite shows fallback error when delete fetch rejects", async () => {
    const favorite = { id: 7, city: "Kyiv", createdAt: "2026-06-03T00:00:00.000Z" };

    fetchMock.mockResolvedValueOnce(jsonResponse([favorite]));
    fetchMock.mockRejectedValueOnce(new Error("network"));

    render(<WeatherDashboardContainer />);

    await waitFor(() => {
      expect(getLatestProps().favorites).toEqual([favorite]);
    });

    await act(async () => {
      await getLatestProps().onRemoveFavorite(favorite.id);
    });

    await waitFor(() => {
      expect(getLatestProps().error).toBe(FALLBACK_ERROR);
    });
  });

  test("onRemoveFavorite sets API message when response is not ok", async () => {
    const favorite = { id: 8, city: "Lviv", createdAt: "2026-06-03T00:00:00.000Z" };

    fetchMock.mockResolvedValueOnce(jsonResponse([favorite]));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: API_ERROR }, { status: 500, statusText: "Server Error" }),
    );

    render(<WeatherDashboardContainer />);

    await waitFor(() => {
      expect(getLatestProps().favorites).toEqual([favorite]);
    });

    await act(async () => {
      await getLatestProps().onRemoveFavorite(favorite.id);
    });

    await waitFor(() => {
      expect(getLatestProps().error).toBe(API_ERROR);
    });
  });

  test("onRemoveFavorite refreshes favorites when delete succeeds", async () => {
    const favorite = { id: 9, city: "Odesa", createdAt: "2026-06-03T00:00:00.000Z" };

    fetchMock.mockResolvedValueOnce(jsonResponse([favorite]));
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    render(<WeatherDashboardContainer />);

    await waitFor(() => {
      expect(getLatestProps().favorites).toEqual([favorite]);
    });

    await act(async () => {
      await getLatestProps().onRemoveFavorite(favorite.id);
    });

    await waitFor(() => {
      expect(getLatestProps().favorites).toEqual([]);
      expect(getLatestProps().error).toBeNull();
    });
  });

  test("tracks isSearching while a search request is pending", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    let resolveWeather: ((value: Response) => void) | undefined;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveWeather = resolve;
        }),
    );

    render(<WeatherDashboardContainer />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/favorites");
    });

    let searchPromise: Promise<void> = Promise.resolve();
    act(() => {
      searchPromise = getLatestProps().onSearch("Kyiv");
    });

    await waitFor(() => {
      expect(getLatestProps().isSearching).toBe(true);
    });

    await act(async () => {
      resolveWeather?.(jsonResponse(weatherSnapshot));
      await searchPromise;
    });

    await waitFor(() => {
      expect(getLatestProps().isSearching).toBe(false);
      expect(getLatestProps().weather).toEqual(weatherSnapshot);
    });
  });
});
