import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";

export default function Login() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.message ?? "Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left brand panel ─────────────────────────────── */}
      <div className="relative hidden lg:flex lg:w-[55%] flex-col justify-between overflow-hidden">
        <img
          src={loginBg}
          alt="African business team collaborating in a modern office"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e1060]/90 via-[#2a1a6e]/80 to-[#12082e]/95" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 p-10">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-900/50">
            <span className="text-white font-bold text-lg">L</span>
          </div>
          <span className="text-white text-xl font-semibold tracking-tight">
            Lexora
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 p-10 pb-14 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["AM", "KO", "ZN", "TB"].map((i) => (
                <div
                  key={i}
                  className="h-9 w-9 rounded-full ring-2 ring-[#1e1060] bg-gradient-to-br from-violet-400/80 to-purple-700/80 flex items-center justify-center text-[10px] font-semibold text-white"
                >
                  {i}
                </div>
              ))}
            </div>
            <p className="text-xs text-white/60">
              Trusted by governance-focused organisations across Africa
            </p>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight max-w-xl">
            Leading Growth Strategies in Business Ecosystems in Africa
          </h1>
          <p className="text-white/70 max-w-md">
            One platform for governance, risk, compliance, projects, finance,
            and people management.
          </p>

          <div className="flex gap-10 pt-4">
            {[
              { value: "5", label: "MODULES" },
              { value: "4", label: "PILLARS" },
              { value: "1", label: "PLATFORM" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="text-[11px] tracking-[0.2em] text-white/50 mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white font-bold">L</span>
            </div>
            <span className="text-xl font-semibold">Lexora</span>
          </div>

          <div className="text-center space-y-2">
            <div className="hidden lg:inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-secondary items-center justify-center shadow-lg shadow-primary/30 mb-2">
              <span className="text-white font-bold text-2xl">L</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to your Lexora workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Remember me
              </label>
              <a
                href="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-base font-semibold shadow-lg shadow-purple-500/25"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <a href="#" className="text-primary hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-primary hover:underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
