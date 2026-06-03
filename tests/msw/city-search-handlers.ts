import { http, HttpResponse } from "msw";
import {
  NOT_FOUND_BODY,
  NOT_FOUND_STATUS,
  makeCurrentByCity,
  makeForecastByCity,
  resolveDeniedCity,
} from "@/tests/msw/openweather-fixtures";

/**
 * Denylist-driven OpenWeatherMap handlers for the city-search scenario:
 * denylisted cities (e.g. Moscow) return the not-found suggestion error, and
 * every other city returns randomized-but-deterministic weather. The lookup is
 * applied to BOTH the current-weather and forecast endpoints.
 *
 * Installed per-test via `server.use(...)` so the repo's default allowlist
 * handlers stay untouched.
 */
export const citySearchHandlers = [
  http.get("https://api.openweathermap.org/data/2.5/weather", ({ request }) => {
    const city = new URL(request.url).searchParams.get("q");
    if (resolveDeniedCity(city)) {
      return HttpResponse.json(NOT_FOUND_BODY, { status: NOT_FOUND_STATUS });
    }

    return HttpResponse.json(makeCurrentByCity(city ?? ""));
  }),
  http.get("https://api.openweathermap.org/data/2.5/forecast", ({ request }) => {
    const city = new URL(request.url).searchParams.get("q");
    if (resolveDeniedCity(city)) {
      return HttpResponse.json(NOT_FOUND_BODY, { status: NOT_FOUND_STATUS });
    }

    return HttpResponse.json(makeForecastByCity(city ?? ""));
  }),
];
