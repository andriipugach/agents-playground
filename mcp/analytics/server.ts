/* v8 ignore file -- Transport bootstrap is verified with MCP HTTP smoke tests. */
import { randomUUID } from "node:crypto";
import { type Server as HttpServer } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import type { Request, Response } from "express";
import { AnalyticsHttpError, fetchAnalyticsMetric } from "./client.js";

const defaultOpenApiUrl = "https://weather-dashboard-apug.vercel.app/api/openapi.json";
const toolName = "get_analytics_metric";

type JsonObject = Record<string, unknown>;

type AnalyticsServerConfig = {
  openApiUrl: string;
  apiBaseUrl: string;
};

type HttpConfig = {
  host: string;
  port: number;
  endpoint: string;
};

type Env = NodeJS.ProcessEnv | Record<string, string | undefined>;

const getConfig = (env: Env = process.env): AnalyticsServerConfig => {
  const openApiUrl = env.ANALYTICS_OPENAPI_URL ?? defaultOpenApiUrl;

  return {
    openApiUrl,
    apiBaseUrl: env.ANALYTICS_API_BASE_URL ?? new URL(openApiUrl).origin,
  };
};

export const getHttpConfig = (env: Env = process.env): HttpConfig => ({
  host: env.MCP_HOST ?? "127.0.0.1",
  port: Number(env.MCP_PORT ?? 3333),
  endpoint: env.MCP_ENDPOINT ?? "/mcp",
});

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isInitializeRequest = (body: unknown) => isJsonObject(body) && body.method === "initialize";

const fetchOpenApiDocument = async (openApiUrl: string) => {
  const response = await fetch(openApiUrl, { headers: { accept: "application/json" } });

  if (!response.ok) {
    throw new Error(`Failed to load OpenAPI spec from ${openApiUrl}: HTTP ${response.status}`);
  }

  return (await response.json()) as JsonObject;
};

const getAnalyticsRequestSchema = (openApiDocument: JsonObject): JsonObject => {
  const components = isJsonObject(openApiDocument.components) ? openApiDocument.components : {};
  const schemas = isJsonObject(components.schemas) ? components.schemas : {};
  const analyticsRequest = schemas.AnalyticsRequest;

  if (!isJsonObject(analyticsRequest)) {
    throw new Error("OpenAPI spec does not contain components.schemas.AnalyticsRequest");
  }

  return analyticsRequest;
};

const getAnalyticsDescription = (
  openApiDocument: JsonObject,
  analyticsRequestSchema: JsonObject,
) => {
  const paths = isJsonObject(openApiDocument.paths) ? openApiDocument.paths : {};
  const analyticsPath = isJsonObject(paths["/api/analytics"]) ? paths["/api/analytics"] : {};
  const analyticsPost = isJsonObject(analyticsPath.post) ? analyticsPath.post : {};
  const summary =
    typeof analyticsPost.summary === "string" ? analyticsPost.summary : "Load an analytics metric";
  const properties = isJsonObject(analyticsRequestSchema.properties)
    ? analyticsRequestSchema.properties
    : {};
  const metric = isJsonObject(properties.metric) ? properties.metric : {};
  const supportedMetrics = Array.isArray(metric.enum)
    ? metric.enum.filter((value) => typeof value === "string")
    : [];

  return `${summary}. Supported metrics: ${supportedMetrics.join(", ")}. The Weather Dashboard API performs request validation and returns HTTP errors for invalid analytics requests.`;
};

const createServer = (openApiDocument: JsonObject, config: AnalyticsServerConfig) => {
  const analyticsRequestSchema = getAnalyticsRequestSchema(openApiDocument);
  const server = new McpServer(
    { name: "weather-dashboard-analytics", version: "0.0.1" },
    {
      capabilities: { tools: {} },
      instructions:
        "Use get_analytics_metric to query Weather Dashboard analytics. Provide ISO date-time strings for from/to. The upstream HTTP API validates metric rules and date intervals.",
    },
  );

  server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: toolName,
        title: "Get Analytics Metric",
        description: getAnalyticsDescription(openApiDocument, analyticsRequestSchema),
        inputSchema: analyticsRequestSchema,
      },
    ],
  }));

  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== toolName) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    }

    try {
      const data = await fetchAnalyticsMetric(request.params.arguments ?? {}, {
        apiBaseUrl: config.apiBaseUrl,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: isJsonObject(data) ? data : { data },
      };
    } catch (error) {
      if (error instanceof AnalyticsHttpError) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `${error.message}\n\n${JSON.stringify(
                {
                  status: error.status,
                  body: error.responseBody,
                },
                null,
                2,
              )}`,
            },
          ],
          structuredContent: {
            status: error.status,
            body: error.responseBody,
          },
        };
      }

      return {
        isError: true,
        content: [
          {
            type: "text",
            text: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  });

  return server;
};

const startHttpServer = async () => {
  const config = getConfig();
  const httpConfig = getHttpConfig();
  const openApiDocument = await fetchOpenApiDocument(config.openApiUrl);
  const app = createMcpExpressApp({ host: httpConfig.host });
  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.all(httpConfig.endpoint, async (request: Request, response: Response) => {
    try {
      const sessionId = request.headers["mcp-session-id"];
      const normalizedSessionId = Array.isArray(sessionId) ? sessionId[0] : sessionId;
      let transport = normalizedSessionId ? transports.get(normalizedSessionId) : undefined;

      if (!transport && request.method === "POST" && isInitializeRequest(request.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            if (transport) {
              transports.set(newSessionId, transport);
            }
          },
        });
        transport.onclose = () => {
          if (transport?.sessionId) {
            transports.delete(transport.sessionId);
          }
        };

        await createServer(openApiDocument, config).connect(transport);
      }

      if (!transport) {
        response.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: initialize first or provide a valid mcp-session-id header",
          },
          id: null,
        });
        return;
      }

      await transport.handleRequest(request, response, request.body);
    } catch (error) {
      console.error("Error handling analytics MCP HTTP request:", error);

      if (!response.headersSent) {
        response.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const httpServer = await new Promise<HttpServer>((resolveServer, reject) => {
    const server = app.listen(httpConfig.port, httpConfig.host, () => resolveServer(server));
    server.on("error", reject);
  });

  console.error(
    `Weather Dashboard analytics MCP HTTP server ready at http://${httpConfig.host}:${httpConfig.port}${httpConfig.endpoint}. OpenAPI: ${config.openApiUrl}. API: ${config.apiBaseUrl}.`,
  );

  process.on("SIGINT", () => {
    for (const transport of transports.values()) {
      void transport.close();
    }
    httpServer.close(() => process.exit(0));
  });
};

const main = async () => {
  await startHttpServer();
};

const isDirectRun = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectRun) {
  main().catch((error) => {
    console.error("Analytics MCP server failed to start:", error);
    process.exit(1);
  });
}
