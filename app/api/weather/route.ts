import { NextResponse } from "next/server";
import { fetchWeatherByCity } from "@/lib/weather-service";

export const GET = async (request: Request) => {
  const city = new URL(request.url).searchParams.get("city") ?? "";

  try {
    const weather = await fetchWeatherByCity(city);
    return NextResponse.json(weather);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "City not found" ? 404 : 400;
    return NextResponse.json({ message }, { status });
  }
};
