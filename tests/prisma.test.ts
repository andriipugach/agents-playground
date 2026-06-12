import { beforeEach, describe, expect, test, vi } from "vitest";

const prismaClientMock = vi.hoisted(() => vi.fn());

vi.mock("@prisma/client", () => ({
  PrismaClient: prismaClientMock,
}));

describe("prisma client", () => {
  beforeEach(() => {
    vi.resetModules();
    prismaClientMock.mockClear();
  });

  test("constructs PrismaClient with options required by Prisma 7", async () => {
    await import("@/lib/prisma");

    expect(prismaClientMock).toHaveBeenCalledWith(expect.any(Object));
  });
});
