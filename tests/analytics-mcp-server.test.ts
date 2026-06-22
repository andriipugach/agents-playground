import { describe, expect, test } from "vitest";
import { getHttpConfig, getToolCallLogContext } from "@/mcp/analytics/server";

describe("analytics MCP server config", () => {
  test("uses localhost HTTP defaults", () => {
    expect(getHttpConfig({})).toEqual({
      host: "127.0.0.1",
      port: 3333,
      endpoint: "/mcp",
    });
  });

  test("reads host and port overrides from environment", () => {
    expect(
      getHttpConfig({
        MCP_HOST: "localhost",
        MCP_PORT: "4444",
        MCP_ENDPOINT: "/analytics-mcp",
      }),
    ).toEqual({
      host: "localhost",
      port: 4444,
      endpoint: "/analytics-mcp",
    });
  });

  test("logs only high-signal tool call context", () => {
    expect(
      getToolCallLogContext({
        metric: "topLoadedCities",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
        limit: 5,
        ignored: "do not log",
      }),
    ).toEqual({
      metric: "topLoadedCities",
      hasLimit: true,
    });
  });
});
