import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  listCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  createCollectionSchema,
  updateCollectionSchema,
} from "../controllers/collections.controller";

const router = Router();

router.use(authenticate, requireRole("TEACHER"));

router.get("/", listCollections);
router.get("/:id", getCollection);
router.post("/", validate(createCollectionSchema), createCollection);
router.put("/:id", validate(updateCollectionSchema), updateCollection);
router.delete("/:id", deleteCollection);

export default router;
