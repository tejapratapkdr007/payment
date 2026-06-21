import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { csvUpload } from "../middleware/upload";
import {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  downloadStudentCsvTemplate,
  importStudentsFromCsv,
  createStudentSchema,
  updateStudentSchema,
  listQuerySchema,
} from "../controllers/students.controller";

const router = Router();

router.use(authenticate, requireRole("TEACHER"));

router.get("/template", downloadStudentCsvTemplate);
router.get("/", validate(listQuerySchema, "query"), listStudents);
router.get("/:id", getStudent);
router.post("/", validate(createStudentSchema), createStudent);
router.put("/:id", validate(updateStudentSchema), updateStudent);
router.delete("/:id", deleteStudent);
router.post("/import", csvUpload.single("file"), importStudentsFromCsv);

export default router;
