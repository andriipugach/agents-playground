export const defaultAnalyticsApiBaseUrl = "https://weather-dashboard-apug.vercel.app";

export type AnalyticsClientOptions = {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
};

export class AnalyticsHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody: unknown,
  ) {
    super(message);
    this.name = "AnalyticsHttpError";
  }
}

const parseResponseBody = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const getErrorMessage = (status: number, body: unknown) => {
  const apiMessage =
    body && typeof body === "object" && "message" in body && typeof body.message === "string"
      ? body.message
      : undefined;

  return `Analytics API returned HTTP ${status}${apiMessage ? `: ${apiMessage}` : ""}`;
};

export const fetchAnalyticsMetric = async (
  payload: unknown,
  { apiBaseUrl = defaultAnalyticsApiBaseUrl, fetchImpl = fetch }: AnalyticsClientOptions = {},
) => {
  const url = new URL("/api/analytics", apiBaseUrl);
  const response = await fetchImpl(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    throw new AnalyticsHttpError(
      getErrorMessage(response.status, responseBody),
      response.status,
      responseBody,
    );
  }

  return responseBody;
};
