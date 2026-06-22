import pino from "pino";

const isVercel = process.env.VERCEL === "1";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "debug",
  ...(isVercel
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "SYS:standard",
          },
        },
      }),
});
