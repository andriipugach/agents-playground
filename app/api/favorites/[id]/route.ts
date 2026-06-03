import { NextResponse } from "next/server";
import { favoritesService } from "@/lib/favorites-repository";

export const DELETE = async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const params = await context.params;
  const id = Number(params.id);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ message: "Invalid favorite id" }, { status: 400 });
  }

  await favoritesService.remove(id);
  return new NextResponse(null, { status: 204 });
};
