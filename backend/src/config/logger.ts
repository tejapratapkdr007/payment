import winston from "winston";
import { config } from "./env";

export const logger = winston.createLogger({
  level: config.isProduction ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    config.isProduction
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  transports: [new winston.transports.Console()],
});
