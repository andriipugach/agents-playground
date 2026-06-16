# Analytics API Design

## Goal

Add a public REST API that returns one analytics insight per request for the existing weather dashboard data. The endpoint is intended for read-only reporting over favorites, city loads, and device activity.

## Endpoint

`POST /api/analytics`

The endpoint is public for now. It does not read or set the device cookie because analytics are global, not scoped to the requesting device.

## Request Schema

Requests use one unified schema:

```json
{
  "metric": "favoritesPerDevice",
  "from": "2026-06-09T00:00:00.000Z",
  "to": "2026-06-16T00:00:00.000Z",
  "limit": 10
}
```

`metric`, `from`, and `to` are required. `from` and `to` must be valid ISO datetime strings and `from` must be earlier than `to`.

`limit` is required only for ranked metrics and must be a positive integer no greater than 100. Non-ranked metrics reject `limit`. No server defaults are applied.

All metric intervals are capped at 366 days.

Supported metrics:

- `favoritesPerDevice`
- `loadedCitiesPerCountry`
- `topLoadedCities`
- `devicesAddedPerDay`
- `topFavoritedCities`
- `favoriteAddsPerDay`
- `uniqueDevicesLoadingCities`

## Data Sources

- `FavoriteCity.createdAt` is used for favorite metrics.
- `LoadedCity.createdAt`, `LoadedCity.city`, `LoadedCity.country`, and `LoadedCity.deviceId` are used for city-load metrics.
- `Device.createdAt` is used for device creation metrics.

All metrics filter rows with `createdAt >= from` and `createdAt < to`.

## Response Shape

The response includes the requested metric, interval, and metric-specific data.

`favoritesPerDevice` returns response-local deterministic labels (`device-1`, `device-2`, etc.) based on the raw grouped device IDs sorted ascending. Raw device cookie IDs are not exposed by the public endpoint.

Examples:

```json
{
  "metric": "topLoadedCities",
  "from": "2026-06-09T00:00:00.000Z",
  "to": "2026-06-16T00:00:00.000Z",
  "data": [{ "city": "Kyiv", "count": 12 }]
}
```

```json
{
  "metric": "uniqueDevicesLoadingCities",
  "from": "2026-06-09T00:00:00.000Z",
  "to": "2026-06-16T00:00:00.000Z",
  "data": { "count": 8 }
}
```

## Error Handling

Invalid JSON, unsupported metrics, missing fields, invalid intervals, and missing limits for ranked metrics return `400` with a user-readable `message`.

Unexpected database errors return `500` with a generic message.

## Testing

Add tests before implementation:

- Request validation rejects missing or invalid fields.
- The route calls the analytics service with parsed request data.
- Each metric aggregation maps Prisma results into stable response data.
- Ranked metrics require and respect `limit`.
