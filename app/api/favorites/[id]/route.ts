import { NextResponse } from "next/server";
import { addDeviceCookie, getDeviceIdentity } from "@/lib/device-id";
import { favoritesService } from "@/lib/favorites-repository";

export const DELETE = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const identity = getDeviceIdentity(request);
  const params = await context.params;
  const id = Number(params.id);

  if (!Number.isFinite(id)) {
    return addDeviceCookie(
      NextResponse.json({ message: "Invalid favorite id" }, { status: 400 }),
      identity,
    );
  }

  await favoritesService.remove(identity.deviceId, id);
  return addDeviceCookie(new NextResponse(null, { status: 204 }), identity);
};
