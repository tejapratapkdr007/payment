import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { publicLimiter } from "../middleware/rateLimiter";
import { downloadReceipt, verifyReceipt } from "../controllers/receipts.controller";

const router = Router();

router.get("/:receiptNumber/download", authenticate, downloadReceipt);

// Public verification - no auth required, matches /verify/:receiptNumber on the frontend.
router.get("/:receiptNumber/verify", publicLimiter, verifyReceipt);

export default router;
