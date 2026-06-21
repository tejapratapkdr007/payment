import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { config } from "./config/env";
import { generalLimiter } from "./middleware/rateLimiter";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth.routes";
import settingsRoutes from "./routes/settings.routes";
import classesRoutes from "./routes/classes.routes";
import collectionsRoutes from "./routes/collections.routes";
import studentsRoutes from "./routes/students.routes";
import paymentsRoutes from "./routes/payments.routes";
import receiptsRoutes from "./routes/receipts.routes";
import reconciliationRoutes from "./routes/reconciliation.routes";
import notificationsRoutes from "./routes/notifications.routes";
import auditLogsRoutes from "./routes/audit-logs.routes";
import analyticsRoutes from "./routes/analytics.routes";
import remindersRoutes from "./routes/reminders.routes";

const app = express();

app.set("trust proxy", 1); // needed for correct req.ip behind Render's proxy / rate limiting

app.use(
  helmet({
    // Allow the locally-served /uploads images and the receipt-PDF's
    // embedded QR codes to be loaded cross-origin from the frontend.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(generalLimiter);

// Serve locally-stored screenshots when Cloudinary isn't configured (dev /
// sandbox fallback — see storage.service.ts).
app.use("/uploads", express.static(path.resolve(process.cwd(), config.localUpload.dir)));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/collections", collectionsRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/receipts", receiptsRoutes);
app.use("/api/reconciliation", reconciliationRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/audit-logs", auditLogsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/reminders", remindersRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
