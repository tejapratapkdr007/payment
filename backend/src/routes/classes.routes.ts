import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  listClasses,
  createClass,
  updateClass,
  deleteClass,
  createClassSchema,
  updateClassSchema,
} from "../controllers/classes.controller";

const router = Router();

router.use(authenticate, requireRole("TEACHER"));

router.get("/", listClasses);
router.post("/", validate(createClassSchema), createClass);
router.put("/:id", validate(updateClassSchema), updateClass);
router.delete("/:id", deleteClass);

export default router;
