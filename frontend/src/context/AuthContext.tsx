import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { api, unwrap } from "../lib/api";
import { Teacher, StudentAuthInfo } from "../types";

type AuthRole = "TEACHER" | "STUDENT" | null;

interface AuthState {
  role: AuthRole;
  teacher: Teacher | null;
  student: StudentAuthInfo | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  loginTeacher: (email: string, password: string) => Promise<void>;
  loginStudent: (pin: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    role: null,
    teacher: null,
    student: null,
    isLoading: true,
  });

  useEffect(() => {
    const role = localStorage.getItem("cpt_role") as AuthRole;
    const raw = localStorage.getItem("cpt_user");
    if (role && raw) {
      const user = JSON.parse(raw);
      setState({
        role,
        teacher: role === "TEACHER" ? user : null,
        student: role === "STUDENT" ? user : null,
        isLoading: false,
      });
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  async function loginTeacher(email: string, password: string) {
    const result = await unwrap<{ token: string; teacher: Teacher }>(
      api.post("/auth/teacher/login", { email, password })
    );
    localStorage.setItem("cpt_token", result.token);
    localStorage.setItem("cpt_role", "TEACHER");
    localStorage.setItem("cpt_user", JSON.stringify(result.teacher));
    setState({ role: "TEACHER", teacher: result.teacher, student: null, isLoading: false });
  }

  async function loginStudent(pin: string) {
    const result = await unwrap<{ token: string; student: StudentAuthInfo }>(
      api.post("/auth/student/login", { pin })
    );
    localStorage.setItem("cpt_token", result.token);
    localStorage.setItem("cpt_role", "STUDENT");
    localStorage.setItem("cpt_user", JSON.stringify(result.student));
    setState({ role: "STUDENT", teacher: null, student: result.student, isLoading: false });
  }

  function logout() {
    localStorage.removeItem("cpt_token");
    localStorage.removeItem("cpt_role");
    localStorage.removeItem("cpt_user");
    setState({ role: null, teacher: null, student: null, isLoading: false });
  }

  return (
    <AuthContext.Provider value={{ ...state, loginTeacher, loginStudent, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
