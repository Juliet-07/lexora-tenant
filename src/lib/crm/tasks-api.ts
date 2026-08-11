import { api } from "../api";

export type TaskStatus = "Backlog" | "In Progress" | "In Review" | "Done";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export const TASK_STATUSES: TaskStatus[] = [
  "Backlog",
  "In Progress",
  "In Review",
  "Done",
];

export interface Task {
  _id: string;
  title: string;
  mandateId: string;
  mandateName: string;
  assignee: string;
  assigneeUserId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  estimateHrs: number;
  loggedHrs: number;
  phase: string;
  recurring: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  title: string;
  mandateId: string;
  assignee: string;
  assigneeUserId?: string;
  priority: TaskPriority;
  dueDate: string;
  estimateHrs: number;
  phase?: string;
  recurring?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  assignee?: string;
  assigneeUserId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  estimateHrs?: number;
  loggedHrs?: number;
  phase?: string;
}

const unwrap = (res: any) => res.data?.data ?? res.data;

export const fetchTasks = async (filters?: {
  mandateId?: string;
  assigneeUserId?: string;
}): Promise<Task[]> => {
  const res = await api.get("/crm/tasks", { params: filters });
  const d = unwrap(res);
  return Array.isArray(d) ? d : [];
};

export const createTask = async (dto: CreateTaskPayload): Promise<Task> => {
  const res = await api.post("/crm/tasks", dto);
  return unwrap(res);
};

export const updateTask = async (
  id: string,
  dto: UpdateTaskPayload,
): Promise<Task> => {
  const res = await api.patch(`/crm/tasks/${id}`, dto);
  return unwrap(res);
};

export const deleteTask = async (id: string): Promise<void> => {
  await api.delete(`/crm/tasks/${id}`);
};
