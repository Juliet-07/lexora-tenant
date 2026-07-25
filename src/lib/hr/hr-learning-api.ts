import { api } from "../api";

export type CourseKind = "video" | "pptx" | "link";
export type EnrollmentStatus = "in_progress" | "completed";

export interface CourseAsset {
  fileName: string;
  mimeType: string;
  url: string | null;
  externalUrl: string | null;
  size: number;
}

export interface AssessmentQuestion {
  key: string;
  prompt: string;
  options: string[];
  correctIndex?: number; // present only in the tenant's own view
}

export interface Course {
  _id: string;
  title: string;
  description: string | null;
  category: string;
  kind: CourseKind;
  mandatory: boolean;
  durationMinutes: number;
  asset: CourseAsset;
  assessment: { passMark: number; questions: AssessmentQuestion[] };
  createdAt: string;
}

export interface EmployeeCourse extends Course {
  myEnrollment: {
    status: EnrollmentStatus;
    attempts: number;
    bestScore: number | null;
    lastScore: number | null;
    completedAt: string | null;
    progress: number;
    lastPositionSeconds: number;
  } | null;
}

export interface CourseStats {
  enrolled: number;
  completed: number;
  avgScore: number;
  completionRate: number;
}

export interface LeaderboardEntry {
  employeeId: string;
  employeeName: string;
  bestScore: number | null;
  attempts: number;
  completedAt: string | null;
}

const PUBLIC_API_BASE = (api.defaults as any)?.baseURL ?? "/api";
export const resolveLearningFileUrl = (url: string): string => {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  const origin = new URL(PUBLIC_API_BASE).origin;
  return `${origin}${url}`;
};

// ── Tenant ──────────────────────────────────────────────────────

export const fetchCourses = async (): Promise<Course[]> => {
  const res = await api.get("/hr/learning/courses");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchCourseById = async (id: string): Promise<Course> => {
  const res = await api.get(`/hr/learning/courses/${id}`);
  return res.data?.data ?? res.data;
};

export interface CourseFormPayload {
  title: string;
  description?: string;
  category: string;
  kind: CourseKind;
  mandatory?: boolean;
  durationMinutes: number;
  externalUrl?: string;
  passMark: number;
  questions: {
    key?: string;
    prompt: string;
    options: string[];
    correctIndex: number;
  }[];
  file?: File | null;
}

const buildCourseFormData = (payload: CourseFormPayload): FormData => {
  const form = new FormData();
  form.append("title", payload.title);
  if (payload.description) form.append("description", payload.description);
  form.append("category", payload.category);
  form.append("kind", payload.kind);
  form.append("mandatory", String(payload.mandatory ?? false));
  form.append("durationMinutes", String(payload.durationMinutes));
  if (payload.externalUrl) form.append("externalUrl", payload.externalUrl);
  form.append("passMark", String(payload.passMark));
  form.append("questions", JSON.stringify(payload.questions));
  if (payload.file) form.append("file", payload.file);
  return form;
};

export const createCourse = async (
  payload: CourseFormPayload,
): Promise<Course> => {
  const res = await api.post(
    "/hr/learning/courses",
    buildCourseFormData(payload),
  );
  return res.data?.data ?? res.data;
};

export const updateCourse = async (
  id: string,
  payload: CourseFormPayload,
): Promise<Course> => {
  const res = await api.patch(
    `/hr/learning/courses/${id}`,
    buildCourseFormData(payload),
  );
  return res.data?.data ?? res.data;
};

export const deleteCourse = async (id: string): Promise<void> => {
  await api.delete(`/hr/learning/courses/${id}`);
};

export const fetchCourseStats = async (id: string): Promise<CourseStats> => {
  const res = await api.get(`/hr/learning/courses/${id}/stats`);
  return res.data?.data ?? res.data;
};

export const fetchCourseLeaderboard = async (
  id: string,
): Promise<LeaderboardEntry[]> => {
  const res = await api.get(`/hr/learning/courses/${id}/leaderboard`);
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

// ── Employee self-service ────────────────────────────────────────

export const fetchMyCourses = async (): Promise<EmployeeCourse[]> => {
  const res = await api.get("/employee/learning/courses");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const fetchMyCourseById = async (
  id: string,
): Promise<EmployeeCourse> => {
  const res = await api.get(`/employee/learning/courses/${id}`);
  return res.data?.data ?? res.data;
};

export const startMyCourse = async (id: string): Promise<void> => {
  await api.post(`/employee/learning/courses/${id}/start`, {});
};

export interface SubmitAssessmentResult {
  score: number;
  passed: boolean;
  bestScore: number;
  attempts: number;
}

export const submitMyAssessment = async (
  id: string,
  answers: { key: string; selectedIndex: number }[],
): Promise<SubmitAssessmentResult> => {
  const res = await api.post(`/employee/learning/courses/${id}/submit`, {
    answers,
  });
  return res.data?.data ?? res.data;
};

export const fetchMyEnrollments = async (): Promise<any[]> => {
  const res = await api.get("/employee/learning/my-enrollments");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const updateMyCourseProgress = async (
  id: string,
  progress: number,
  positionSeconds?: number,
): Promise<void> => {
  await api.patch(`/employee/learning/courses/${id}/progress`, {
    progress,
    positionSeconds,
  });
};

export interface MyCertificate {
  courseId: string;
  courseTitle: string;
  score: number;
  completedAt: string;
}

export const fetchMyCertificates = async (): Promise<MyCertificate[]> => {
  const res = await api.get("/employee/learning/certificates");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const downloadMyCertificate = async (
  courseId: string,
): Promise<void> => {
  const res = await api.get(
    `/employee/learning/courses/${courseId}/certificate`,
    {
      responseType: "blob",
    },
  );
  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `certificate-${courseId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
