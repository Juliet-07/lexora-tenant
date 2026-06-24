import { api } from "./api";

export type DocumentUploader = "employee" | "tenant";

export interface EmployeeDocumentFile {
  _id: string;
  employeeId: string;
  fileName: string;
  label: string | null;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: DocumentUploader;
  createdAt: string;
}

const API_BASE: string = import.meta.env.VITE_REACT_APP_BASE_URL;
const SERVER_ROOT = API_BASE.replace(/\/api\/?$/, "");

export function toAbsoluteFileUrl(relativeUrl: string): string {
  if (!relativeUrl) return relativeUrl;
  if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
  return `${SERVER_ROOT}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;
}
// ── Tenant-side ──

export const fetchEmployeeDocuments = async (
  employeeId: string,
): Promise<EmployeeDocumentFile[]> => {
  const res = await api.get(`/hr/employees/${employeeId}/documents`);
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const uploadEmployeeDocumentAsTenant = async (
  employeeId: string,
  file: File,
  label?: string,
): Promise<EmployeeDocumentFile> => {
  const formData = new FormData();
  formData.append("file", file);
  if (label) formData.append("label", label);
  const res = await api.post(
    `/hr/employees/${employeeId}/documents`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return res.data?.data ?? res.data;
};

export const deleteEmployeeDocumentAsTenant = async (
  documentId: string,
): Promise<void> => {
  await api.delete(`/hr/employees/documents/${documentId}`);
};

// ── Employee self-service ──

export const fetchMyDocuments = async (): Promise<EmployeeDocumentFile[]> => {
  const res = await api.get("/employee/documents");
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [];
};

export const uploadMyDocument = async (
  file: File,
  label?: string,
): Promise<EmployeeDocumentFile> => {
  const formData = new FormData();
  formData.append("file", file);
  if (label) formData.append("label", label);
  const res = await api.post("/employee/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.data ?? res.data;
};

export const deleteMyDocument = async (documentId: string): Promise<void> => {
  await api.delete(`/employee/documents/${documentId}`);
};
