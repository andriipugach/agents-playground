export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Weather Dashboard REST API",
    version: "0.0.1",
    description:
      "REST API documentation for weather search, location weather, favorites, and analytics.",
  },
  paths: {
    "/api/analytics": {
      post: {
        summary: "Load an analytics metric",
        tags: ["Analytics"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AnalyticsRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Analytics metric response",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AnalyticsResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": {
            description: "Unexpected analytics loading failure",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/favorites": {
      get: {
        summary: "List favorite cities for the current device",
        tags: ["Favorites"],
        responses: {
          "200": {
            description: "Favorite cities",
            headers: {
              "Set-Cookie": {
                description: "Sets a deviceId cookie when one is missing.",
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/FavoriteCity" },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Add a city to favorites for the current device",
        tags: ["Favorites"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateFavoriteRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Created favorite city",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FavoriteCity" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/api/favorites/{id}": {
      delete: {
        summary: "Remove a favorite city for the current device",
        tags: ["Favorites"],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "204": { description: "Favorite removed" },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/api/weather": {
      get: {
        summary: "Load weather by city name",
        tags: ["Weather"],
        parameters: [
          {
            name: "city",
            in: "query",
            required: true,
            schema: { type: "string", minLength: 1 },
          },
        ],
        responses: {
          "200": {
            description: "Weather snapshot",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WeatherSnapshot" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/weather/location": {
      get: {
        summary: "Load weather by coordinates",
        tags: ["Weather"],
        parameters: [
          {
            name: "lat",
            in: "query",
            required: true,
            schema: { type: "number", minimum: -90, maximum: 90 },
          },
          {
            name: "lon",
            in: "query",
            required: true,
            schema: { type: "number", minimum: -180, maximum: 180 },
          },
        ],
        responses: {
          "200": {
            description: "Weather snapshot",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WeatherSnapshot" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
  components: {
    responses: {
      BadRequest: {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFound: {
        description: "Requested city was not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
    schemas: {
      AnalyticsRequest: {
        type: "object",
        required: ["metric", "from", "to"],
        additionalProperties: false,
        properties: {
          metric: {
            type: "string",
            enum: [
              "favoritesPerDevice",
              "loadedCitiesPerCountry",
              "topLoadedCities",
              "devicesAddedPerDay",
              "topFavoritedCities",
              "favoriteAddsPerDay",
              "uniqueDevicesLoadingCities",
            ],
          },
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
          limit: { type: "integer", minimum: 1, maximum: 100 },
        },
      },
      AnalyticsResponse: {
        oneOf: [
          { $ref: "#/components/schemas/CountByDeviceMetricResponse" },
          { $ref: "#/components/schemas/CountByCountryMetricResponse" },
          { $ref: "#/components/schemas/CountByCityMetricResponse" },
          { $ref: "#/components/schemas/CountByDayMetricResponse" },
          { $ref: "#/components/schemas/UniqueCountMetricResponse" },
        ],
      },
      CountByDeviceMetricResponse: {
        type: "object",
        required: ["metric", "from", "to", "data"],
        properties: {
          metric: { const: "favoritesPerDevice" },
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
          data: {
            type: "array",
            items: {
              type: "object",
              required: ["device", "count"],
              properties: {
                device: { type: "string", examples: ["device-1"] },
                count: { type: "integer" },
              },
            },
          },
        },
      },
      CountByCountryMetricResponse: {
        type: "object",
        required: ["metric", "from", "to", "data"],
        properties: {
          metric: { const: "loadedCitiesPerCountry" },
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
          data: {
            type: "array",
            items: {
              type: "object",
              required: ["country", "count"],
              properties: {
                country: { type: "string", examples: ["UA"] },
                count: { type: "integer" },
              },
            },
          },
        },
      },
      CountByCityMetricResponse: {
        type: "object",
        required: ["metric", "from", "to", "data"],
        properties: {
          metric: { enum: ["topLoadedCities", "topFavoritedCities"] },
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
          data: {
            type: "array",
            items: {
              type: "object",
              required: ["city", "count"],
              properties: {
                city: { type: "string", examples: ["Kyiv"] },
                count: { type: "integer" },
              },
            },
          },
        },
      },
      CountByDayMetricResponse: {
        type: "object",
        required: ["metric", "from", "to", "data"],
        properties: {
          metric: { enum: ["devicesAddedPerDay", "favoriteAddsPerDay"] },
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
          data: {
            type: "array",
            items: {
              type: "object",
              required: ["date", "count"],
              properties: {
                date: { type: "string", format: "date" },
                count: { type: "integer" },
              },
            },
          },
        },
      },
      UniqueCountMetricResponse: {
        type: "object",
        required: ["metric", "from", "to", "data"],
        properties: {
          metric: { const: "uniqueDevicesLoadingCities" },
          from: { type: "string", format: "date-time" },
          to: { type: "string", format: "date-time" },
          data: {
            type: "object",
            required: ["count"],
            properties: { count: { type: "integer" } },
          },
        },
      },
      CreateFavoriteRequest: {
        type: "object",
        required: ["city"],
        additionalProperties: false,
        properties: {
          city: { type: "string", minLength: 1, examples: ["Kyiv"] },
        },
      },
      FavoriteCity: {
        type: "object",
        required: ["id", "city", "createdAt"],
        properties: {
          id: { type: "integer", examples: [1] },
          city: { type: "string", examples: ["Kyiv"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      WeatherForecastDay: {
        type: "object",
        required: ["date", "temperatureC", "description", "iconUrl"],
        properties: {
          date: { type: "string", examples: ["2026-06-16"] },
          temperatureC: { type: "number" },
          description: { type: "string", examples: ["clear sky"] },
          iconUrl: { type: "string", format: "uri" },
        },
      },
      WeatherSnapshot: {
        type: "object",
        required: ["city", "country", "current", "forecast"],
        properties: {
          city: { type: "string", examples: ["Kyiv"] },
          country: { type: "string", examples: ["UA"] },
          current: {
            type: "object",
            required: ["temperatureC", "description", "humidity", "windSpeed", "iconUrl"],
            properties: {
              temperatureC: { type: "number" },
              description: { type: "string" },
              humidity: { type: "integer" },
              windSpeed: { type: "number" },
              iconUrl: { type: "string", format: "uri" },
            },
          },
          forecast: {
            type: "array",
            items: { $ref: "#/components/schemas/WeatherForecastDay" },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string" },
        },
      },
    },
  },
} as const;
