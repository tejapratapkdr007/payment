import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  getOverview,
  listCollectionSummaries,
  analyticsOverviewQuerySchema,
} from "../controllers/analytics.controller";

const router = Router();

router.use(authenticate, requireRole("TEACHER"));

router.get("/overview", validate(analyticsOverviewQuerySchema, "query"), getOverview);
router.get("/collections", listCollectionSummaries);

export default router;
