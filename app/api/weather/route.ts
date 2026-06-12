import { NextResponse } from "next/server";
import { addDeviceCookie, getDeviceIdentity } from "@/lib/device-id";
import { prisma } from "@/lib/prisma";
import { fetchWeatherByCity } from "@/lib/weather-service";

export const GET = async (request: Request) => {
  const identity = getDeviceIdentity(request);
  const city = new URL(request.url).searchParams.get("city") ?? "";

  try {
    const weather = await fetchWeatherByCity(city);
    await prisma.loadedCity.create({
      data: {
        city: weather.city,
        country: weather.country,
        device: {
          connectOrCreate: {
            where: { id: identity.deviceId },
            create: { id: identity.deviceId },
          },
        },
      },
    });

    return addDeviceCookie(NextResponse.json(weather), identity);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "City not found" ? 404 : 400;
    return addDeviceCookie(NextResponse.json({ message }, { status }), identity);
  }
};
