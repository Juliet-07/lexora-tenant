import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { api } from "@/lib/api";

// ─── Role mapping ─────────────────────────────────────────────
export type UserRole = "admin" | "employee";
export type ViewMode = "admin" | "employee";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  roles: string[];
  role: UserRole;
  tenantId: string | null;
  businessName: string;
  mustChangePassword: boolean;
  hierarchyRole: "regular" | "manager" | "head_of_department" | "owner" | null;
  hasAdminAccess: boolean;
  accessibleModules: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  viewMode: ViewMode;
  switchView: (mode: ViewMode) => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

function deriveRole(userType: string, roles: string[]): UserRole {
  if (userType === "employee") return "employee";

  const adminRoles = ["tenant_owner", "tenant_admin"];

  return roles.some((r) => adminRoles.includes(r)) ? "admin" : "employee";
}

function deriveHasAdminAccess(userType: string, roles: string[]): boolean {
  if (userType === "tenant") return true; // root tenant login, or the Owner
  if (userType === "employee" && roles.length > 0) return true; // tagged staff
  return false;
}

function mapUser(
  raw: any,
  hierarchyRole?: string,
  accessibleModules?: string[],
): AuthUser {
  const roles = raw.roles ?? [];
  return {
    id: raw._id,
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email,
    userType: raw.userType,
    roles,
    role: deriveRole(raw.userType, roles),
    tenantId: raw.tenantId ?? null,
    businessName: raw.tenantProfile?.businessName ?? "",
    mustChangePassword: raw.mustChangePassword ?? false,
    hierarchyRole: (hierarchyRole as AuthUser["hierarchyRole"]) ?? null,
    hasAdminAccess: deriveHasAdminAccess(raw.userType, roles),
    accessibleModules: accessibleModules ?? [],
  };
}

const viewModeKey = (userId: string) => `tenantViewMode:${userId}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("admin");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Hydrate from localStorage on mount ───────────────────
  useEffect(() => {
    const stored = localStorage.getItem("tenantUser");
    const token = localStorage.getItem("tenantToken");
    if (stored && token) {
      try {
        const parsed: AuthUser = JSON.parse(stored);
        setUser(parsed);
        const storedView = localStorage.getItem(viewModeKey(parsed.id));
        setViewMode(
          storedView === "employee" && parsed.hasAdminAccess
            ? "employee"
            : "admin",
        );
      } catch {
        localStorage.removeItem("tenantUser");
      }
    }
    setIsLoading(false);
  }, []);

  // ── Login ─────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/login", { email, password });
      const {
        user: rawUser,
        tokens,
        hierarchyRole,
        accessibleModules,
      } = res.data.data;

      localStorage.setItem("tenantToken", tokens.accessToken);

      const mapped = mapUser(rawUser, hierarchyRole, accessibleModules);
      localStorage.setItem("tenantUser", JSON.stringify(mapped));
      setUser(mapped);
      setViewMode("admin"); // always land in admin view on fresh login
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Invalid email or password";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem("tenantToken");
    localStorage.removeItem("tenantUser");
    setUser(null);
  };

  // ── View switch — no re-authentication, same session ──────
  const switchView = (mode: ViewMode) => {
    if (!user?.hasAdminAccess) return; // no-op for plain employees
    setViewMode(mode);
    localStorage.setItem(viewModeKey(user.id), mode);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin: !!user?.hasAdminAccess && viewMode === "admin",
        viewMode,
        switchView,
        isLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
