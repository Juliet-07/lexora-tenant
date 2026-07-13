// ─────────────────────────────────────────────────────────────
// Learning & Development store (client-side prototype).
// Persists to localStorage. Powers:
//   • Tenant course library (upload video / pptx, build assessment)
//   • Employee course consumption + assessment + certificate
//   • Tenant analytics + per-course leaderboard
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";

export type CourseKind = "video" | "pptx" | "link";

export interface CourseAsset {
  fileName: string;
  mimeType: string;
  dataUrl?: string; // inline (small files); undefined when stored externally
  externalUrl?: string;
  size: number;
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface Assessment {
  passMark: number; // 0-100
  questions: AssessmentQuestion[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  kind: CourseKind;
  asset?: CourseAsset;
  durationMinutes: number;
  mandatory: boolean;
  createdAt: string;
  assessment: Assessment;
}

export interface Enrollment {
  id: string;
  courseId: string;
  employeeId: string;
  employeeName: string;
  status: "in_progress" | "completed";
  progress: number; // 0-100
  lastAccessedAt: string;
  startedAt: string;
  completedAt?: string;
  bestScore?: number;
  attempts: number;
  certificateId?: string;
}

export interface Certificate {
  id: string;
  courseId: string;
  courseTitle: string;
  employeeId: string;
  employeeName: string;
  score: number;
  issuedAt: string;
}

const K_COURSES = "lexora.learning.courses.v1";
const K_ENROLL = "lexora.learning.enrollments.v1";
const K_CERTS = "lexora.learning.certificates.v1";
const EVT = "learning:changed";

const seedCourses: Course[] = [
  {
    id: "CRS-101",
    title: "Anti-Money Laundering Fundamentals",
    description:
      "Overview of AML regulations, red flags and reporting obligations.",
    category: "Compliance",
    kind: "link",
    asset: { fileName: "AML 101", mimeType: "text/html", externalUrl: "https://www.youtube.com/embed/xIRBhkE9Zug", size: 0 },
    durationMinutes: 45,
    mandatory: true,
    createdAt: new Date(Date.now() - 30 * 864e5).toISOString(),
    assessment: {
      passMark: 70,
      questions: [
        {
          id: "q1",
          prompt: "Which of the following is a red flag for money laundering?",
          options: [
            "Consistent salary deposits",
            "Structuring cash deposits below reporting thresholds",
            "Regular utility bill payments",
            "Direct debit for rent",
          ],
          correctIndex: 1,
        },
        {
          id: "q2",
          prompt: "What does KYC stand for?",
          options: [
            "Keep Your Cash",
            "Know Your Customer",
            "Key Yield Curve",
            "Known Yearly Compliance",
          ],
          correctIndex: 1,
        },
        {
          id: "q3",
          prompt: "A Suspicious Transaction Report should be filed when…",
          options: [
            "Only if a crime is confirmed",
            "Whenever a client complains",
            "When there is reasonable suspicion of illicit activity",
            "Only for cash amounts above $1M",
          ],
          correctIndex: 2,
        },
      ],
    },
  },
];

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadCourses(): Course[] {
  if (typeof window === "undefined") return seedCourses;
  const raw = localStorage.getItem(K_COURSES);
  if (raw === null) {
    localStorage.setItem(K_COURSES, JSON.stringify(seedCourses));
    return seedCourses;
  }
  return safeParse<Course[]>(raw, []);
}

function loadEnrollments(): Enrollment[] {
  if (typeof window === "undefined") return [];
  return safeParse<Enrollment[]>(localStorage.getItem(K_ENROLL), []);
}

function loadCerts(): Certificate[] {
  if (typeof window === "undefined") return [];
  return safeParse<Certificate[]>(localStorage.getItem(K_CERTS), []);
}

function emit() {
  window.dispatchEvent(new CustomEvent(EVT));
}

function saveCourses(v: Course[]) {
  localStorage.setItem(K_COURSES, JSON.stringify(v));
  emit();
}
function saveEnrollments(v: Enrollment[]) {
  localStorage.setItem(K_ENROLL, JSON.stringify(v));
  emit();
}
function saveCerts(v: Certificate[]) {
  localStorage.setItem(K_CERTS, JSON.stringify(v));
  emit();
}

const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ── Courses ────────────────────────────────────────────────
export const getCourses = () => loadCourses();
export const getCourse = (id: string) => loadCourses().find((c) => c.id === id);

export function upsertCourse(course: Course) {
  const list = loadCourses();
  const idx = list.findIndex((c) => c.id === course.id);
  if (idx === -1) list.unshift(course);
  else list[idx] = course;
  saveCourses(list);
}

export function deleteCourse(id: string) {
  saveCourses(loadCourses().filter((c) => c.id !== id));
  saveEnrollments(loadEnrollments().filter((e) => e.courseId !== id));
  saveCerts(loadCerts().filter((c) => c.courseId !== id));
}

export function newCourseId() {
  return uid("CRS");
}

// ── Enrollments ────────────────────────────────────────────
export const getEnrollments = () => loadEnrollments();

export function enrollmentsForEmployee(employeeId: string) {
  return loadEnrollments().filter((e) => e.employeeId === employeeId);
}

export function enrollmentsForCourse(courseId: string) {
  return loadEnrollments().filter((e) => e.courseId === courseId);
}

export function findEnrollment(courseId: string, employeeId: string) {
  return loadEnrollments().find(
    (e) => e.courseId === courseId && e.employeeId === employeeId,
  );
}

export function startCourse(
  courseId: string,
  employeeId: string,
  employeeName: string,
): Enrollment {
  const existing = findEnrollment(courseId, employeeId);
  if (existing) return existing;
  const rec: Enrollment = {
    id: uid("ENR"),
    courseId,
    employeeId,
    employeeName,
    status: "in_progress",
    progress: 5,
    startedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    attempts: 0,
  };
  saveEnrollments([rec, ...loadEnrollments()]);
  return rec;
}

export function updateProgress(courseId: string, employeeId: string, progress: number) {
  const list = loadEnrollments();
  const idx = list.findIndex(
    (e) => e.courseId === courseId && e.employeeId === employeeId,
  );
  if (idx === -1) return;
  list[idx] = {
    ...list[idx],
    progress: Math.max(list[idx].progress, Math.min(100, Math.round(progress))),
    lastAccessedAt: new Date().toISOString(),
  };
  saveEnrollments(list);
}

export function submitAttempt(
  courseId: string,
  employeeId: string,
  employeeName: string,
  score: number,
): { passed: boolean; enrollment: Enrollment; certificate?: Certificate } {
  const course = getCourse(courseId);
  const pass = course ? score >= course.assessment.passMark : false;
  const list = loadEnrollments();
  let idx = list.findIndex(
    (e) => e.courseId === courseId && e.employeeId === employeeId,
  );
  if (idx === -1) {
    list.unshift(startCourse(courseId, employeeId, employeeName));
    idx = 0;
  }
  const prev = list[idx];
  let certificate: Certificate | undefined;
  const updated: Enrollment = {
    ...prev,
    attempts: prev.attempts + 1,
    bestScore: Math.max(prev.bestScore ?? 0, score),
    lastAccessedAt: new Date().toISOString(),
    progress: pass ? 100 : Math.max(prev.progress, 80),
    status: pass ? "completed" : prev.status,
    completedAt: pass ? prev.completedAt ?? new Date().toISOString() : prev.completedAt,
  };
  if (pass && !prev.certificateId && course) {
    certificate = {
      id: uid("CERT"),
      courseId,
      courseTitle: course.title,
      employeeId,
      employeeName,
      score,
      issuedAt: new Date().toISOString(),
    };
    updated.certificateId = certificate.id;
    saveCerts([certificate, ...loadCerts()]);
  }
  list[idx] = updated;
  saveEnrollments(list);
  return { passed: pass, enrollment: updated, certificate };
}

// ── Certificates ───────────────────────────────────────────
export const getCertificates = () => loadCerts();
export const getCertificate = (id: string) =>
  loadCerts().find((c) => c.id === id);
export const certificatesForEmployee = (employeeId: string) =>
  loadCerts().filter((c) => c.employeeId === employeeId);

// ── Aggregations (tenant leaderboard) ──────────────────────
export function courseStats(courseId: string) {
  const enrolls = enrollmentsForCourse(courseId);
  const completed = enrolls.filter((e) => e.status === "completed");
  const avgScore =
    completed.length === 0
      ? 0
      : Math.round(
          completed.reduce((s, e) => s + (e.bestScore ?? 0), 0) /
            completed.length,
        );
  return {
    enrolled: enrolls.length,
    completed: completed.length,
    avgScore,
    completionRate:
      enrolls.length === 0
        ? 0
        : Math.round((completed.length / enrolls.length) * 100),
  };
}

export function courseLeaderboard(courseId: string) {
  return enrollmentsForCourse(courseId)
    .filter((e) => e.status === "completed")
    .sort((a, b) => (b.bestScore ?? 0) - (a.bestScore ?? 0))
    .slice(0, 10);
}

// ── Reactive hook ──────────────────────────────────────────
export function useLearning() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const h = () => setTick((t) => t + 1);
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return {
    tick,
    courses: loadCourses(),
    enrollments: loadEnrollments(),
    certificates: loadCerts(),
  };
}

// ── File helper ────────────────────────────────────────────
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
