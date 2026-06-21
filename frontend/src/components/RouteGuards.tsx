import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RequireTeacher() {
  const { role, isLoading } = useAuth();
  if (isLoading) return null;
  if (role !== "TEACHER") return <Navigate to="/teacher/login" replace />;
  return <Outlet />;
}

export function RequireStudent() {
  const { role, isLoading } = useAuth();
  if (isLoading) return null;
  if (role !== "STUDENT") return <Navigate to="/login" replace />;
  return <Outlet />;
}
