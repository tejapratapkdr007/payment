export type JwtRole = "TEACHER" | "STUDENT";

export interface TeacherTokenPayload {
  role: "TEACHER";
  teacherId: string;
  email: string;
}

export interface StudentTokenPayload {
  role: "STUDENT";
  studentId: string;
  pin: string;
}

export type TokenPayload = TeacherTokenPayload | StudentTokenPayload;

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
