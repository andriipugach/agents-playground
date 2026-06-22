import { describe, expect, test } from "vitest";
import { getHttpConfig } from "@/mcp/analytics/server";

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
});
