import { PrismaClient } from "@prisma/client";
import { config } from "./env";

// A single shared Prisma Client instance. Creating more than one per process
// exhausts the database connection pool, so this module guarantees re-use
// even when ts-node-dev hot-reloads the server in development.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: config.isProduction ? ["error", "warn"] : ["error", "warn"],
  });

if (!config.isProduction) {
  global.__prisma = prisma;
}
