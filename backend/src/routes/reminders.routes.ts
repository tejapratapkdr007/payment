import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  listReminderCandidates,
  getBulkReminderText,
  remindersQuerySchema,
} from "../controllers/reminders.controller";

const router = Router();

router.use(authenticate, requireRole("TEACHER"));

router.get("/", validate(remindersQuerySchema, "query"), listReminderCandidates);
router.get("/bulk", validate(remindersQuerySchema, "query"), getBulkReminderText);

export default router;
