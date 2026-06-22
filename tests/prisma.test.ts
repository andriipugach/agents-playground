import { beforeEach, describe, expect, test, vi } from "vitest";

const loggerDebugMock = vi.hoisted(() => vi.fn());
const prismaMocks = vi.hoisted(() => {
  const on = vi.fn();

  return {
    on,
    prismaClient: vi.fn(function PrismaClientMock() {
      return { $on: on };
    }),
  };
});

vi.mock("@prisma/client", () => ({
  PrismaClient: prismaMocks.prismaClient,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: loggerDebugMock,
  },
}));

describe("prisma client", () => {
  const globalForPrisma = globalThis as unknown as {
    prisma?: unknown;
    prismaQueryLoggingConfigured?: boolean;
  };

  beforeEach(() => {
    vi.resetModules();
    delete globalForPrisma.prisma;
    delete globalForPrisma.prismaQueryLoggingConfigured;
    prismaMocks.on.mockClear();
    prismaMocks.prismaClient.mockClear();
    loggerDebugMock.mockClear();
  });

  test("constructs PrismaClient with options required by Prisma 7", async () => {
    await import("@/lib/prisma");

    expect(prismaMocks.prismaClient).toHaveBeenCalledWith(
      expect.objectContaining({ adapter: expect.any(Object) }),
    );
  });

  test("configures Prisma query events for debug logging", async () => {
    await import("@/lib/prisma");

    expect(prismaMocks.prismaClient).toHaveBeenCalledWith(
      expect.objectContaining({
        log: [{ emit: "event", level: "query" }],
      }),
    );
    expect(prismaMocks.on).toHaveBeenCalledWith("query", expect.any(Function));
  });

  test("logs Prisma queries at debug level", async () => {
    await import("@/lib/prisma");
    const queryHandler = prismaMocks.on.mock.calls.find(([event]) => event === "query")?.[1];

    queryHandler?.({
      duration: 12,
      params: '["Kyiv"]',
      query: "SELECT * FROM Weather WHERE city = $1",
      target: "quaint::connector::metrics",
      timestamp: new Date("2026-06-17T13:00:00.000Z"),
    });

    expect(loggerDebugMock).toHaveBeenCalledWith(
      {
        durationMs: 12,
        params: '["Kyiv"]',
        query: "SELECT * FROM Weather WHERE city = $1",
        target: "quaint::connector::metrics",
      },
      "Prisma query",
    );
  });
});
