import { NextResponse } from "next/server";
import { addDeviceCookie, getDeviceIdentity } from "@/lib/device-id";
import { favoritesService } from "@/lib/favorites-repository";

export const GET = async (request: Request) => {
  const identity = getDeviceIdentity(request);
  const favorites = await favoritesService.list(identity.deviceId);
  return addDeviceCookie(NextResponse.json(favorites), identity);
};

export const POST = async (request: Request) => {
  const identity = getDeviceIdentity(request);
  const payload = (await request.json()) as { city?: string };

  try {
    const created = await favoritesService.add(identity.deviceId, payload.city ?? "");
    return addDeviceCookie(NextResponse.json(created, { status: 201 }), identity);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return addDeviceCookie(NextResponse.json({ message }, { status: 400 }), identity);
  }
};
