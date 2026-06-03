/**
 * Next.js instrumentation hook. When `WEATHER_USE_MOCKS` is enabled we start an
 * MSW Node server in the server runtime so the OpenWeatherMap requests made by
 * `lib/weather-service.ts` are intercepted and served from the same mock
 * handlers used in tests. Any other outbound request is passed through.
 */
export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (process.env.WEATHER_USE_MOCKS !== "true") {
    return;
  }

  const { setupServer } = await import("msw/node");
  const { citySearchHandlers } = await import("@/tests/msw/city-search-handlers");

  const server = setupServer(...citySearchHandlers);
  server.listen({ onUnhandledRequest: "bypass" });

  console.info("[MSW] Weather API mocking enabled (WEATHER_USE_MOCKS=true)");
};
