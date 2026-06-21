import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { statementUpload } from "../middleware/upload";
import { reconcileStatement } from "../controllers/reconciliation.controller";

const router = Router();

router.post(
  "/upload",
  authenticate,
  requireRole("TEACHER"),
  statementUpload.single("statement"),
  reconcileStatement
);

export default router;
