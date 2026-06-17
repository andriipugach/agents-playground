import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { logger } from "@/lib/logger";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prismaClientOptions = {
  adapter,
  log: [{ emit: "event", level: "query" }],
} as const satisfies Prisma.PrismaClientOptions;

type PrismaClientWithQueryLogging = PrismaClient<typeof prismaClientOptions>;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientWithQueryLogging;
  prismaQueryLoggingConfigured?: boolean;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaClientOptions);

if (!globalForPrisma.prismaQueryLoggingConfigured) {
  prisma.$on("query", (event: Prisma.QueryEvent) => {
    logger.debug(
      {
        durationMs: event.duration,
        params: event.params,
        query: event.query,
        target: event.target,
      },
      "Prisma query",
    );
  });
  globalForPrisma.prismaQueryLoggingConfigured = true;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
