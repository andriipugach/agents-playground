import { beforeEach, describe, expect, test, vi } from "vitest";
import { AnalyticsValidationError } from "@/lib/analytics-service";

const analyticsServiceMock = vi.hoisted(() => ({
  getMetric: vi.fn(),
}));

vi.mock("@/lib/analytics-repository", () => ({
  analyticsService: analyticsServiceMock,
}));

import { POST } from "@/app/api/analytics/route";

describe("analytics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns the requested analytics response without setting a device cookie", async () => {
    const analyticsResponse = {
      metric: "topLoadedCities",
      from: "2026-06-09T00:00:00.000Z",
      to: "2026-06-16T00:00:00.000Z",
      data: [{ city: "Kyiv", count: 12 }],
    };
    analyticsServiceMock.getMetric.mockResolvedValueOnce(analyticsResponse);

    const body = {
      metric: "topLoadedCities",
      from: "2026-06-09T00:00:00.000Z",
      to: "2026-06-16T00:00:00.000Z",
      limit: 5,
    };

    const response = await POST(
      new Request("https://example.com/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );

    await expect(response.json()).resolves.toEqual(analyticsResponse);
    expect(response.status).toBe(200);
    expect(analyticsServiceMock.getMetric).toHaveBeenCalledWith(body);
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });

  test("returns 400 for invalid JSON without calling the service", async () => {
    const response = await POST(
      new Request("https://example.com/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );

    await expect(response.json()).resolves.toEqual({ message: "Invalid JSON request body" });
    expect(response.status).toBe(400);
    expect(analyticsServiceMock.getMetric).not.toHaveBeenCalled();
  });

  test("returns 400 for analytics validation errors", async () => {
    analyticsServiceMock.getMetric.mockRejectedValueOnce(
      new AnalyticsValidationError("limit is required for this metric"),
    );

    const response = await POST(
      new Request("https://example.com/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metric: "topLoadedCities",
          from: "2026-06-09T00:00:00.000Z",
          to: "2026-06-16T00:00:00.000Z",
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      message: "limit is required for this metric",
    });
    expect(response.status).toBe(400);
  });

  test("returns 500 for unexpected service errors", async () => {
    analyticsServiceMock.getMetric.mockRejectedValueOnce(new Error("database offline"));

    const response = await POST(
      new Request("https://example.com/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metric: "favoritesPerDevice",
          from: "2026-06-09T00:00:00.000Z",
          to: "2026-06-16T00:00:00.000Z",
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({ message: "Unable to load analytics" });
    expect(response.status).toBe(500);
  });
});
