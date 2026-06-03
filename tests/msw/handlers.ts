import { http, HttpResponse } from "msw";

const currentWeatherPayload = {
  coord: { lon: -0.13, lat: 51.51 },
  weather: [{ description: "clear sky", icon: "01d" }],
  main: { temp: 22.5, humidity: 40 },
  wind: { speed: 3.2 },
  name: "London",
  sys: { country: "GB" },
};

const forecastPayload = {
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
  ],
};

export const handlers = [
  http.get("https://api.openweathermap.org/data/2.5/weather", ({ request }) => {
    const city = new URL(request.url).searchParams.get("q");
    if (city?.toLowerCase() === "unknown") {
      return HttpResponse.json({ message: "city not found" }, { status: 404 });
    }

    return HttpResponse.json(currentWeatherPayload);
  }),
  http.get("https://api.openweathermap.org/data/2.5/forecast", () =>
    HttpResponse.json(forecastPayload),
  ),
];
