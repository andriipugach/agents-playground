import { NextResponse } from "next/server";
import { favoritesService } from "@/lib/favorites-repository";

export const GET = async () => {
  const favorites = await favoritesService.list();
  return NextResponse.json(favorites);
};

export const POST = async (request: Request) => {
  const payload = (await request.json()) as { city?: string };

  try {
    const created = await favoritesService.add(payload.city ?? "");
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ message }, { status: 400 });
  }
};
