import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { screenshotUpload } from "../middleware/upload";
import {
  submitPayment,
  submitPaymentSchema,
  getMyPayments,
  listPayments,
  listPaymentsQuerySchema,
  getPaymentDetail,
  approvePayment,
  rejectPayment,
  requestReupload,
  addPaymentNotes,
  reviewActionSchema,
} from "../controllers/payments.controller";

const router = Router();

router.use(authenticate);

// Student routes
router.get("/me", requireRole("STUDENT"), getMyPayments);
router.post(
  "/:collectionId/submit",
  requireRole("STUDENT"),
  screenshotUpload.single("screenshot"),
  validate(submitPaymentSchema),
  submitPayment
);

// Teacher routes
router.get("/", requireRole("TEACHER"), validate(listPaymentsQuerySchema, "query"), listPayments);
router.get("/:id", requireRole("TEACHER"), getPaymentDetail);
router.post("/:id/approve", requireRole("TEACHER"), validate(reviewActionSchema), approvePayment);
router.post("/:id/reject", requireRole("TEACHER"), validate(reviewActionSchema), rejectPayment);
router.post("/:id/request-reupload", requireRole("TEACHER"), validate(reviewActionSchema), requestReupload);
router.post("/:id/notes", requireRole("TEACHER"), validate(reviewActionSchema), addPaymentNotes);

export default router;
