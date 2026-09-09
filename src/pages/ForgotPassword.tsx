import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle2, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import axios from "axios";
import loginBg from "@/assets/login-bg.jpg";

export default function ForgotPassword() {
  const apiURL = import.meta.env.VITE_REACT_APP_BASE_URL;
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await axios.post(`${apiURL}/auth/forgot-password`, { email });
      setSent(true);
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
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
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure account recovery
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight max-w-xl">
            Regain access to your workspace
          </h1>
          <p className="text-white/70 max-w-md">
            Reset links are single-use and expire after one hour, keeping your
            governance, risk and finance data protected.
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
              {sent ? "Check your email" : "Reset your password"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {sent
                ? "We've sent you a secure link"
                : "We'll send a link to reset your password"}
            </p>
          </div>

          {sent ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
                <CheckCircle2 className="h-7 w-7 text-success" />
              </div>
              <p className="text-sm text-muted-foreground">
                If <strong className="text-foreground">{email}</strong> is
                registered, a reset link has been sent. It expires in 1 hour.
              </p>
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl"
                onClick={() => navigate("/login")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to sign in
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
                <Label htmlFor="email" className="text-sm font-semibold">
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl"
                    required
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
                    Sending…
                  </>
                ) : (
                  "Send reset link"
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
