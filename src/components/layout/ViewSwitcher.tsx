import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Briefcase, User } from "lucide-react";

export function ViewSwitcher() {
  const { user, viewMode, switchView } = useAuth();

  // Only renders for logins that actually have somewhere to switch
  // to — the Owner, or any staff member with at least one granted
  // role. A plain employee never sees this at all.
  if (!user?.hasAdminAccess) return null;

  return (
    <div className="hidden sm:flex items-center gap-0.5 h-9 p-0.5 rounded-lg bg-muted/60 border border-border/50">
      <Button
        size="sm"
        variant={viewMode === "admin" ? "default" : "ghost"}
        className={`h-8 px-3 gap-1.5 text-xs ${viewMode === "admin" ? "" : "text-muted-foreground"}`}
        onClick={() => switchView("admin")}
      >
        <Briefcase className="h-3.5 w-3.5" />
        Admin
      </Button>
      <Button
        size="sm"
        variant={viewMode === "employee" ? "default" : "ghost"}
        className={`h-8 px-3 gap-1.5 text-xs ${viewMode === "employee" ? "" : "text-muted-foreground"}`}
        onClick={() => switchView("employee")}
      >
        <User className="h-3.5 w-3.5" />
        Employee Workspace
      </Button>
    </div>
  );
}
