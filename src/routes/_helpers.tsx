import { ReactNode } from "react";
import { AppLayout } from "@/components/layout/AppLayout";

/** Wraps a page element in the standard AppLayout shell. */
export const layout = (node: ReactNode) => <AppLayout>{node}</AppLayout>;

export interface RouteContext {
  isAdmin: boolean;
}
