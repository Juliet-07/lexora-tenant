import { createContext, useContext, useState, ReactNode } from "react";
import { teamMembers } from "@/data/mockData";

export type UserRole = "admin" | "team_member";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ADMIN_USER: AuthUser = {
  id: "ADMIN-001",
  name: "Sarah Chen",
  email: "admin@lexora.com",
  role: "admin",
  avatar: "SC",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = (email: string, password: string): boolean => {
    // Admin login
    if (email === "admin@lexora.com" && password === "admin123") {
      setUser(ADMIN_USER);
      return true;
    }
    // Team member login
    const member = teamMembers.find((m) => m.email === email);
    if (member && password === "team123") {
      setUser({
        id: member.id,
        name: member.name,
        email: member.email,
        role: "team_member",
        avatar: member.avatar,
      });
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
