import { describe, expect, test } from "vitest";
import { GET } from "@/app/api/openapi.json/route";
import { openApiDocument } from "@/lib/openapi";

describe("openapi route", () => {
  test("returns the shared OpenAPI document", async () => {
    const response = GET();

    await expect(response.json()).resolves.toEqual(openApiDocument);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  test("documents every implemented REST API path", () => {
    expect(Object.keys(openApiDocument.paths)).toEqual([
      "/api/analytics",
      "/api/favorites",
      "/api/favorites/{id}",
      "/api/weather",
      "/api/weather/location",
    ]);
  });

  test("documents operation methods, parameters, request bodies, and responses", () => {
    expect(openApiDocument.paths["/api/weather"]?.get?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "city", in: "query", required: true }),
      ]),
    );
    expect(openApiDocument.paths["/api/weather"]?.get?.responses).toHaveProperty("200");
    expect(openApiDocument.paths["/api/weather"]?.get?.responses).toHaveProperty("400");
    expect(openApiDocument.paths["/api/weather"]?.get?.responses).toHaveProperty("404");

    expect(openApiDocument.paths["/api/favorites"]?.get?.responses).toHaveProperty("200");
    expect(openApiDocument.paths["/api/favorites"]?.post?.requestBody).toBeDefined();
    expect(openApiDocument.paths["/api/favorites"]?.post?.responses).toHaveProperty("201");

    expect(openApiDocument.paths["/api/favorites/{id}"]?.delete?.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "id", in: "path", required: true })]),
    );
    expect(openApiDocument.paths["/api/favorites/{id}"]?.delete?.responses).toHaveProperty("204");

    expect(openApiDocument.paths["/api/analytics"]?.post?.requestBody).toBeDefined();
    expect(openApiDocument.paths["/api/analytics"]?.post?.responses).toHaveProperty("200");
    expect(openApiDocument.paths["/api/analytics"]?.post?.responses).toHaveProperty("400");
    expect(openApiDocument.paths["/api/analytics"]?.post?.responses).toHaveProperty("500");
  });
});
