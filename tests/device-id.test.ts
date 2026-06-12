import { describe, expect, test, vi } from "vitest";
import { addDeviceCookie, getDeviceIdentity } from "@/lib/device-id";

describe("device id helper", () => {
  test("uses an existing device id cookie without setting a new cookie", () => {
    const request = new Request("https://example.com/api/favorites", {
      headers: { cookie: "theme=dark; deviceId=device-a" },
    });

    const identity = getDeviceIdentity(request);

    expect(identity).toEqual({ deviceId: "device-a", cookie: null });
  });

  test("uses a quoted existing device id cookie without setting a new cookie", () => {
    const request = new Request("https://example.com/api/favorites", {
      headers: { cookie: 'theme=dark; deviceId="device-a"' },
    });

    const identity = getDeviceIdentity(request);

    expect(identity).toEqual({ deviceId: "device-a", cookie: null });
  });

  test("creates a device id and cookie when the request has no device id", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValueOnce("generated-device-id");
    const request = new Request("https://example.com/api/favorites");

    const identity = getDeviceIdentity(request);
    const response = addDeviceCookie(Response.json({ ok: true }), identity);

    expect(identity.deviceId).toBe("generated-device-id");
    expect(response.headers.get("Set-Cookie")).toContain("deviceId=generated-device-id");
    expect(response.headers.get("Set-Cookie")).toContain("Path=/");
    expect(response.headers.get("Set-Cookie")).toContain("HttpOnly");
    expect(response.headers.get("Set-Cookie")).toContain("SameSite=Lax");
  });
});
