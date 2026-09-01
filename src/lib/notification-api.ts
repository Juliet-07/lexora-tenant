import { api } from "@/lib/api";

export type TenantNotificationType =
  | "Onboarding"
  | "Invoice"
  | "Ticket"
  | "Compliance"
  | "Document"
  | "HR"
  | "General";

export interface TenantNotification {
  _id: string;
  tenantId: string;
  recipientUserId: string;
  type: TenantNotificationType;
  title: string;
  description: string;
  link: string | null;
  read: boolean;
  readAt: string | null;
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export const fetchMyNotifications = async (): Promise<TenantNotification[]> => {
  const res = await api.get("/tenant/notifications");
  return res.data?.data ?? res.data ?? [];
};

export const fetchUnreadCount = async (): Promise<{ count: number }> => {
  const res = await api.get("/tenant/notifications/unread-count");
  return res.data?.data ?? res.data;
};

export const markNotificationRead = async (
  id: string,
): Promise<TenantNotification> => {
  const res = await api.post(`/tenant/notifications/${id}/read`);
  return res.data?.data ?? res.data;
};

export const markAllNotificationsRead = async (): Promise<{
  marked: boolean;
}> => {
  const res = await api.post("/tenant/notifications/mark-all-read");
  return res.data?.data ?? res.data;
};
