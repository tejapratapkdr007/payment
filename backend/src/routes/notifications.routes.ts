import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  notificationListQuerySchema,
} from "../controllers/notifications.controller";

const router = Router();

router.use(authenticate, requireRole("STUDENT"));

router.get("/", validate(notificationListQuerySchema, "query"), listMyNotifications);
router.post("/:id/read", markNotificationRead);
router.post("/read-all", markAllNotificationsRead);

export default router;
