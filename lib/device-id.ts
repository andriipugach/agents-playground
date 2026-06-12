import { parse, serialize } from "cookie";

export const DEVICE_COOKIE_NAME = "deviceId";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type DeviceIdentity = {
  deviceId: string;
  cookie: string | null;
};

const normalizeCookieValue = (value: string | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed;
};

const createDeviceCookie = (deviceId: string) => {
  return serialize(DEVICE_COOKIE_NAME, deviceId, {
    httpOnly: true,
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
};

export const getDeviceIdentity = (request: Request): DeviceIdentity => {
  const cookies = parse(request.headers.get("cookie") ?? "");
  const existingDeviceId = normalizeCookieValue(cookies[DEVICE_COOKIE_NAME]);

  if (existingDeviceId) {
    return { deviceId: existingDeviceId, cookie: null };
  }

  const deviceId = crypto.randomUUID();
  return { deviceId, cookie: createDeviceCookie(deviceId) };
};

export const addDeviceCookie = <TResponse extends Response>(
  response: TResponse,
  identity: DeviceIdentity,
): TResponse => {
  if (identity.cookie) {
    response.headers.append("Set-Cookie", identity.cookie);
  }

  return response;
};
