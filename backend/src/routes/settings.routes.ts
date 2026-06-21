import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  getSettings,
  updateSettings,
  updateSettingsSchema,
  getUpiQrCode,
} from "../controllers/settings.controller";

const router = Router();

router.get("/", authenticate, requireRole("TEACHER"), getSettings);
router.put("/", authenticate, requireRole("TEACHER"), validate(updateSettingsSchema), updateSettings);

// Accessible by both teacher (their own QR) and student (their class teacher's QR).
router.get("/upi-qr", authenticate, getUpiQrCode);

export default router;
