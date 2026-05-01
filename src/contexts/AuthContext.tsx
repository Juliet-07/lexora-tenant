import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { api } from "@/lib/api";

// ─── Role mapping ─────────────────────────────────────────────
export type UserRole = "admin" | "team_member";

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
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

function deriveRole(roles: string[]): UserRole {
  const adminRoles = ["tenant_owner", "tenant_admin"];
  return roles.some((r) => adminRoles.includes(r)) ? "admin" : "team_member";
}

function mapUser(raw: any): AuthUser {
  return {
    id: raw._id,
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email,
    userType: raw.userType,
    roles: raw.roles ?? [],
    role: deriveRole(raw.roles ?? []),
    tenantId: raw.tenantId ?? null,
    businessName: raw.tenantProfile?.businessName ?? "",
    mustChangePassword: raw.mustChangePassword ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // start true — hydrate from storage
  const [error, setError] = useState<string | null>(null);

  // ── Hydrate from localStorage on mount ───────────────────
  useEffect(() => {
    const stored = localStorage.getItem("tenantUser");
    const token = localStorage.getItem("tenantToken");
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
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
      const { user: rawUser, tokens } = res.data.data;

      localStorage.setItem("tenantToken", tokens.accessToken);

      const mapped = mapUser(rawUser);
      localStorage.setItem("tenantUser", JSON.stringify(mapped));
      setUser(mapped);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin: user?.role === "admin",
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
