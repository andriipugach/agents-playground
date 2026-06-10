import { NextResponse } from "next/server";
import { fetchWeatherByCoordinates } from "@/lib/weather-service";

const parseCoordinate = (value: string | null): number | null => {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidLatitude = (value: number | null): value is number =>
  value !== null && value >= -90 && value <= 90;

const isValidLongitude = (value: number | null): value is number =>
  value !== null && value >= -180 && value <= 180;

export const GET = async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const latitude = parseCoordinate(params.get("lat"));
  const longitude = parseCoordinate(params.get("lon"));

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return NextResponse.json(
      { message: "Valid latitude and longitude are required" },
      { status: 400 },
    );
  }

  try {
    const weather = await fetchWeatherByCoordinates(latitude, longitude);
    return NextResponse.json(weather);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "City not found" ? 404 : 400;
    return NextResponse.json({ message }, { status });
  }
};
