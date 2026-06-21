import { Router } from "express";
import { validate } from "../middleware/validate";
import { authLimiter } from "../middleware/rateLimiter";
import {
  registerTeacher,
  loginTeacher,
  loginStudent,
  registerTeacherSchema,
  loginTeacherSchema,
  studentLoginSchema,
} from "../controllers/auth.controller";

const router = Router();

router.post("/teacher/register", authLimiter, validate(registerTeacherSchema), registerTeacher);
router.post("/teacher/login", authLimiter, validate(loginTeacherSchema), loginTeacher);
router.post("/student/login", authLimiter, validate(studentLoginSchema), loginStudent);

export default router;
