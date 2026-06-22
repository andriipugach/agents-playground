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
import { logger } from "../../lib/logger.js";
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

export const getToolCallLogContext = (arguments_: unknown) => {
  const hasLimit = isJsonObject(arguments_) && "limit" in arguments_;
  const metric =
    isJsonObject(arguments_) && typeof arguments_.metric === "string"
      ? arguments_.metric
      : undefined;
  const context: { hasLimit: boolean; metric?: string } = { hasLimit };

  if (metric) {
    context.metric = metric;
  }

  return context;
};

// The MCP tool mirrors the app's published OpenAPI schema
// so clients see the same request contract as the HTTP API.
const fetchOpenApiDocument = async (openApiUrl: string) => {
  logger.info({ openApiUrl }, "Loading analytics OpenAPI document");

  try {
    const response = await fetch(openApiUrl, { headers: { accept: "application/json" } });

    if (!response.ok) {
      throw new Error(`Failed to load OpenAPI spec from ${openApiUrl}: HTTP ${response.status}`);
    }

    logger.info({ openApiUrl }, "Loaded analytics OpenAPI document");

    return (await response.json()) as JsonObject;
  } catch (error) {
    logger.error({ err: error, openApiUrl }, "Failed to load analytics OpenAPI document");
    throw error;
  }
};

// Keep schema extraction strict so startup fails before exposing a broken tool.
const getAnalyticsRequestSchema = (openApiDocument: JsonObject): JsonObject => {
  const components = isJsonObject(openApiDocument.components) ? openApiDocument.components : {};
  const schemas = isJsonObject(components.schemas) ? components.schemas : {};
  const analyticsRequest = schemas.AnalyticsRequest;

  if (!isJsonObject(analyticsRequest)) {
    throw new Error("OpenAPI spec does not contain components.schemas.AnalyticsRequest");
  }

  return analyticsRequest;
};

// Tool descriptions come from OpenAPI plus the metric enum for quick discovery.
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

// Each MCP session gets its own server instance bound to a Streamable HTTP transport.
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

  server.server.setRequestHandler(ListToolsRequestSchema, async () => {
    const analyticsMetricsTool = {
      name: toolName,
      title: "Get Analytics Metric",
      description: getAnalyticsDescription(openApiDocument, analyticsRequestSchema),
      inputSchema: analyticsRequestSchema,
    };

    return {
      tools: [analyticsMetricsTool],
    };
  });

  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== toolName) {
      logger.warn({ requestedTool: request.params.name }, "Rejected unknown analytics MCP tool");
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    }

    const toolContext = getToolCallLogContext(request.params.arguments);

    try {
      logger.info(
        { apiBaseUrl: config.apiBaseUrl, toolName, ...toolContext },
        "Calling analytics MCP tool",
      );

      const data = await fetchAnalyticsMetric(request.params.arguments ?? {}, {
        apiBaseUrl: config.apiBaseUrl,
      });

      logger.debug({ toolName, ...toolContext }, "Analytics MCP tool call succeeded");

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        structuredContent: isJsonObject(data) ? data : { data },
      };
    } catch (error) {
      if (error instanceof AnalyticsHttpError) {
        logger.warn(
          { err: error, status: error.status, toolName, ...toolContext },
          "Analytics API returned an error for MCP tool call",
        );

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

      logger.error({ err: error, toolName, ...toolContext }, "Analytics MCP tool call failed");

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
  logger.info({ ...config, ...httpConfig }, "Starting analytics MCP HTTP server");
  const openApiDocument = await fetchOpenApiDocument(config.openApiUrl);
  const app = createMcpExpressApp({ host: httpConfig.host });
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // Streamable HTTP routes follow the MCP session lifecycle: initialize first,
  // then reuse the returned mcp-session-id on later requests.
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
              logger.info({ sessionId: newSessionId }, "Initialized analytics MCP session");
            }
          },
        });
        transport.onclose = () => {
          if (transport?.sessionId) {
            logger.info({ sessionId: transport.sessionId }, "Closed analytics MCP session");
            transports.delete(transport.sessionId);
          }
        };

        await createServer(openApiDocument, config).connect(transport);
      }

      if (!transport) {
        logger.warn(
          { method: request.method, sessionId: normalizedSessionId },
          "Rejected analytics MCP request without an initialized session",
        );

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
      logger.error({ err: error }, "Error handling analytics MCP HTTP request");

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

  logger.info(
    {
      apiBaseUrl: config.apiBaseUrl,
      endpoint: httpConfig.endpoint,
      host: httpConfig.host,
      openApiUrl: config.openApiUrl,
      port: httpConfig.port,
      url: `http://${httpConfig.host}:${httpConfig.port}${httpConfig.endpoint}`,
    },
    "Weather Dashboard analytics MCP HTTP server ready",
  );

  process.on("SIGINT", () => {
    logger.info({ sessions: transports.size }, "Shutting down analytics MCP HTTP server");

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
    logger.error({ err: error }, "Analytics MCP server failed to start");
    process.exit(1);
  });
}
