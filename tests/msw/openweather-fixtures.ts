import type { CurrentWeatherPayload, ForecastPayload } from "@/lib/openweather";

/**
 * Inverted allowlist (a denylist): these cities return a not-found error.
 * Everything else returns a randomized-but-deterministic success payload.
 */
export const DENYLIST_CITIES = ["Moscow"] as const;

/** Sample success cities used for the e2e `test.each` coverage. */
export const SUCCESS_CITIES = ["Kyiv", "Paris", "Tokyo"] as const;

/** Error body + status returned for any denylisted city. */
export const NOT_FOUND_STATUS = 404;
export const NOT_FOUND_BODY = {
  cod: "404",
  message: "City not found, did you mean Zhytomyr?",
} as const;

/** Case-insensitive, trimmed lookup. Returns the canonical denied city or undefined. */
export const resolveDeniedCity = (query: string | null | undefined) =>
  DENYLIST_CITIES.find((city) => city.toLowerCase() === query?.trim().toLowerCase());

const CONDITIONS = [
  { description: "clear sky", icon: "01d" },
  { description: "few clouds", icon: "02d" },
  { description: "scattered clouds", icon: "03d" },
  { description: "light rain", icon: "10d" },
  { description: "thunderstorm", icon: "11d" },
  { description: "snow", icon: "13d" },
] as const;

const COUNTRIES = ["UA", "FR", "JP", "DE", "US", "PL"] as const;

const FORECAST_DATES = [
  "2026-06-04",
  "2026-06-05",
  "2026-06-06",
  "2026-06-07",
  "2026-06-08",
] as const;

/** Deterministic 32-bit hash of a string, used to seed the PRNG. */
const hashSeed = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/** mulberry32 PRNG: same seed -> same sequence, so "random" stays deterministic. */
const makeRng = (seed: number) => {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Build a randomized-but-deterministic current-weather payload for a city.
 * The same city always produces the same payload across test runs.
 */
export const makeCurrentByCity = (city: string): CurrentWeatherPayload => {
  const rng = makeRng(hashSeed(`current:${city.toLowerCase()}`));
  const condition = CONDITIONS[Math.floor(rng() * CONDITIONS.length)];

  return {
    weather: [condition],
    main: {
      temp: round1(-10 + rng() * 45),
      humidity: Math.floor(rng() * 101),
    },
    wind: { speed: round1(rng() * 20) },
    name: city,
    sys: { country: COUNTRIES[Math.floor(rng() * COUNTRIES.length)] },
  };
};

/**
 * Build a randomized-but-deterministic 5-day forecast payload for a city.
 * Two entries per day exercise the service's per-day de-duplication.
 */
export const makeForecastByCity = (city: string): ForecastPayload => {
  const rng = makeRng(hashSeed(`forecast:${city.toLowerCase()}`));

  const list = FORECAST_DATES.flatMap((date) =>
    ["09:00:00", "15:00:00"].map((time) => ({
      dt_txt: `${date} ${time}`,
      main: { temp: round1(-10 + rng() * 45) },
      weather: [CONDITIONS[Math.floor(rng() * CONDITIONS.length)]],
    })),
  );

  return { list };
};

/**
 * Fixed, hand-written reference payloads. Used for exact-value happy-path and
 * missing-field assertions where deterministic literals are clearer than the
 * generated ones.
 */
export const referenceCurrent: CurrentWeatherPayload = {
  weather: [{ description: "clear sky", icon: "01d" }],
  main: { temp: 22.5, humidity: 40 },
  wind: { speed: 3.2 },
  name: "Kyiv",
  sys: { country: "UA" },
};

export const referenceForecast: ForecastPayload = {
  list: [
    {
      dt_txt: "2026-06-04 12:00:00",
      main: { temp: 21.2 },
      weather: [{ description: "few clouds", icon: "02d" }],
    },
    {
      dt_txt: "2026-06-05 12:00:00",
      main: { temp: 20.1 },
      weather: [{ description: "light rain", icon: "10d" }],
    },
    {
      dt_txt: "2026-06-06 12:00:00",
      main: { temp: 19.3 },
      weather: [{ description: "scattered clouds", icon: "03d" }],
    },
    {
      dt_txt: "2026-06-07 12:00:00",
      main: { temp: 18.4 },
      weather: [{ description: "overcast clouds", icon: "04d" }],
    },
    {
      dt_txt: "2026-06-08 12:00:00",
      main: { temp: 23.6 },
      weather: [{ description: "moderate rain", icon: "10d" }],
    },
  ],
};
