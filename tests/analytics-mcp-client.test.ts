import { describe, expect, test, vi } from "vitest";
import { fetchAnalyticsMetric } from "@/mcp/analytics/client";

const successfulPayload = {
  metric: "topLoadedCities",
  from: "2026-06-09T00:00:00.000Z",
  to: "2026-06-16T00:00:00.000Z",
  limit: 5,
};

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });

describe("analytics MCP API client", () => {
  test("posts the raw analytics payload to the configured API", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        metric: "topLoadedCities",
        from: "2026-06-09T00:00:00.000Z",
        to: "2026-06-16T00:00:00.000Z",
        data: [{ city: "Kyiv", count: 4 }],
      }),
    );

    await expect(
      fetchAnalyticsMetric(successfulPayload, {
        apiBaseUrl: "https://example.test",
        fetchImpl,
      }),
    ).resolves.toEqual({
      metric: "topLoadedCities",
      from: "2026-06-09T00:00:00.000Z",
      to: "2026-06-16T00:00:00.000Z",
      data: [{ city: "Kyiv", count: 4 }],
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://example.test/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(successfulPayload),
    });
  });

  test("surfaces analytics API errors with status and response body", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ message: "limit is required for this metric" }, { status: 400 }),
      );

    await expect(
      fetchAnalyticsMetric(
        {
          metric: "topLoadedCities",
          from: "2026-06-09T00:00:00.000Z",
          to: "2026-06-16T00:00:00.000Z",
        },
        {
          apiBaseUrl: "https://example.test",
          fetchImpl,
        },
      ),
    ).rejects.toMatchObject({
      status: 400,
      responseBody: { message: "limit is required for this metric" },
      message: "Analytics API returned HTTP 400: limit is required for this metric",
    });
  });
});
