import { beforeEach, describe, expect, test, vi } from "vitest";

const pinoMock = vi.hoisted(() => vi.fn(() => ({ debug: vi.fn() })));

vi.mock("pino", () => ({
  default: pinoMock,
}));

describe("logger", () => {
  const originalLogLevel = process.env.LOG_LEVEL;

  beforeEach(() => {
    vi.resetModules();
    pinoMock.mockClear();

    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }
  });

  test("uses debug as the default log level", async () => {
    delete process.env.LOG_LEVEL;

    await import("@/lib/logger");

    expect(pinoMock).toHaveBeenCalledWith(expect.objectContaining({ level: "debug" }));
  });

  test("allows LOG_LEVEL to override the default level", async () => {
    process.env.LOG_LEVEL = "info";

    await import("@/lib/logger");

    expect(pinoMock).toHaveBeenCalledWith(expect.objectContaining({ level: "info" }));
  });
});
