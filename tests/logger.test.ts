import { beforeEach, describe, expect, test, vi } from "vitest";

const pinoMock = vi.hoisted(() => vi.fn(() => ({ debug: vi.fn() })));

vi.mock("pino", () => ({
  default: pinoMock,
}));

describe("logger", () => {
  const originalLogLevel = process.env.LOG_LEVEL;
  const originalVercel = process.env.VERCEL;

  beforeEach(() => {
    vi.resetModules();
    pinoMock.mockClear();

    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }

    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
  });

  test("uses debug as the default log level", async () => {
    delete process.env.LOG_LEVEL;

    await import("@/lib/logger");

    expect(pinoMock).toHaveBeenCalledWith(expect.objectContaining({ level: "debug" }));
  });

  test("formats logs with pino-pretty", async () => {
    await import("@/lib/logger");

    expect(pinoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "SYS:standard",
          },
        },
      }),
    );
  });

  test("allows LOG_LEVEL to override the default level", async () => {
    process.env.LOG_LEVEL = "info";

    await import("@/lib/logger");

    expect(pinoMock).toHaveBeenCalledWith(expect.objectContaining({ level: "info" }));
  });

  test("does not configure pino-pretty on Vercel", async () => {
    process.env.VERCEL = "1";

    await import("@/lib/logger");

    expect(pinoMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        transport: expect.objectContaining({ target: "pino-pretty" }),
      }),
    );
  });
});
