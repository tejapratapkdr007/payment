import app from "./app";
import { config } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { terminateOcrWorker } from "./services/ocr.service";

const server = app.listen(config.port, () => {
  logger.info(`Class Payment Tracker Pro backend listening on port ${config.port} (${config.nodeEnv})`);
});

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    try {
      await terminateOcrWorker();
      await prisma.$disconnect();
      logger.info("Shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error("Error during shutdown", { err });
      process.exit(1);
    }
  });

  // Force-exit if graceful shutdown hangs for too long.
  setTimeout(() => {
    logger.warn("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason });
});
