import { Routes, Route, Navigate } from "react-router-dom";
import { RequireTeacher, RequireStudent } from "./components/RouteGuards";

import { StudentLoginPage } from "./pages/student/StudentLoginPage";
import { StudentLayout } from "./pages/student/StudentLayout";
import { StudentDashboardPage } from "./pages/student/StudentDashboardPage";

import { TeacherLoginPage } from "./pages/teacher/TeacherLoginPage";
import { TeacherLayout } from "./pages/teacher/TeacherLayout";
import { TeacherOverviewPage } from "./pages/teacher/TeacherOverviewPage";
import { TeacherPaymentsPage } from "./pages/teacher/TeacherPaymentsPage";
import { TeacherStudentsPage } from "./pages/teacher/TeacherStudentsPage";
import { TeacherClassesPage } from "./pages/teacher/TeacherClassesPage";
import { TeacherReconcilePage } from "./pages/teacher/TeacherReconcilePage";
import { TeacherRemindersPage } from "./pages/teacher/TeacherRemindersPage";
import { TeacherAuditLogsPage } from "./pages/teacher/TeacherAuditLogsPage";
import { TeacherSettingsPage } from "./pages/teacher/TeacherSettingsPage";

import { ReceiptVerifyPage } from "./pages/public/ReceiptVerifyPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public */}
      <Route path="/verify/:receiptNumber" element={<ReceiptVerifyPage />} />

      {/* Student */}
      <Route path="/login" element={<StudentLoginPage />} />
      <Route element={<RequireStudent />}>
        <Route element={<StudentLayout />}>
          <Route path="/dashboard" element={<StudentDashboardPage />} />
        </Route>
      </Route>

      {/* Teacher */}
      <Route path="/teacher/login" element={<TeacherLoginPage />} />
      <Route element={<RequireTeacher />}>
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherOverviewPage />} />
          <Route path="payments" element={<TeacherPaymentsPage />} />
          <Route path="students" element={<TeacherStudentsPage />} />
          <Route path="classes" element={<TeacherClassesPage />} />
          <Route path="reconcile" element={<TeacherReconcilePage />} />
          <Route path="reminders" element={<TeacherRemindersPage />} />
          <Route path="audit-logs" element={<TeacherAuditLogsPage />} />
          <Route path="settings" element={<TeacherSettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
