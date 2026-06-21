import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { listAuditLogs, listAuditLogsQuerySchema } from "../controllers/audit-logs.controller";

const router = Router();

router.get("/", authenticate, requireRole("TEACHER"), validate(listAuditLogsQuerySchema, "query"), listAuditLogs);

export default router;
