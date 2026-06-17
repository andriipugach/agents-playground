# Swagger REST API Design

## Goal

Add Swagger/OpenAPI documentation for the implemented REST APIs in the weather dashboard. The docs should make the current API surface discoverable for developers and client tools without changing endpoint behavior.

## Scope

Document these implemented endpoints:

- `GET /api/weather`
- `GET /api/weather/location`
- `GET /api/favorites`
- `POST /api/favorites`
- `DELETE /api/favorites/{id}`
- `POST /api/analytics`

Expose the OpenAPI document as JSON and provide an in-app Swagger UI page that reads from that JSON endpoint.

## Architecture

Add a shared OpenAPI document module, `lib/openapi.ts`, that exports a single OpenAPI 3.1 document. The document defines common schemas for weather snapshots, forecast days, favorite cities, analytics requests, analytics responses, and error messages.

Add `GET /api/openapi.json` as a Next.js route handler that returns the shared document. This gives API clients, tests, and the Swagger UI one canonical source.

Add a Swagger UI page in the app that renders the spec from `/api/openapi.json`. The UI should be client-side only because Swagger UI depends on browser APIs.

## API Documentation Details

Weather endpoints document query parameters, successful `WeatherSnapshot` responses, and `400` or `404` error responses.

Favorites endpoints document the device-cookie behavior, favorite city payloads, successful list/create/delete responses, and validation errors.

Analytics documents the supported metrics, interval and limit validation rules, metric-specific response data shapes, and `400`/`500` error responses.

## Testing

Add tests before implementation:

- `GET /api/openapi.json` returns a valid OpenAPI document with expected metadata.
- The OpenAPI document includes every currently implemented REST API path.
- Important operations include the expected methods, parameters, request bodies, and response status codes.

## Documentation

Update `README.md` with the Swagger UI location and JSON spec endpoint so local developers can find the docs.
