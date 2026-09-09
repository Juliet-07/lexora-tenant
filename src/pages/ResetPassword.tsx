import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import axios from "axios";
import loginBg from "@/assets/login-bg.jpg";

export default function ResetPassword() {
  const apiURL = import.meta.env.VITE_REACT_APP_BASE_URL;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${apiURL}/auth/reset-password`, {
        token,
        newPassword,
        confirmPassword,
      });
      setDone(true);
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message ??
          "This reset link is invalid or has expired.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex lg:w-[55%] flex-col justify-between overflow-hidden">
        <img
          src={loginBg}
          alt="African business team collaborating in a modern office"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e1060]/90 via-[#2a1a6e]/80 to-[#12082e]/95" />

        <div className="relative z-10 p-10">
          <img
            src="/lexora-logo-light.png"
            alt="Lexora Africa"
            className="h-20 w-auto object-contain"
          />
        </div>

        <div className="relative z-10 p-10 pb-14 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs text-white/80">
            <KeyRound className="h-3.5 w-3.5" />
            Set a new password
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight max-w-xl">
            Strong passwords protect strong businesses
          </h1>
          <p className="text-white/70 max-w-md">
            Use at least 8 characters, mixing letters, numbers and symbols for
            the best protection of your Lexora workspace.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-8">
          <div className="flex lg:hidden items-center justify-center">
            <img
              src="/lexora-logo.png"
              alt="Lexora Africa"
              className="h-16 w-auto object-contain"
            />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              {done ? "Password reset" : "Choose a new password"}
            </h2>
            {!done && token && (
              <p className="text-sm text-muted-foreground">
                Enter and confirm your new password below
              </p>
            )}
          </div>

          {!token ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
                <AlertCircle className="h-7 w-7 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">
                This reset link is missing its token. Request a new one from the
                sign-in page.
              </p>
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl"
                onClick={() => navigate("/login")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to sign in
              </Button>
            </div>
          ) : done ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </div>
              <p className="text-sm text-muted-foreground">
                Your password has been reset. You can now sign in with your new
                password.
              </p>
              <Button
                className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-base font-semibold shadow-lg shadow-purple-500/25"
                onClick={() => navigate("/login")}
              >
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              {errorMessage && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
                  {errorMessage}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-semibold">
                  New password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl"
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-semibold"
                >
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl"
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-base font-semibold shadow-lg shadow-purple-500/25"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resetting…
                  </>
                ) : (
                  "Reset password"
                )}
              </Button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
