import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold text-primary-foreground">
              CP
            </span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            {done ? "Password reset" : "Choose a new password"}
          </h1>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="pt-6 pb-8 px-8">
            {!token ? (
              <div className="space-y-4 text-center">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                <p className="text-sm text-muted-foreground">
                  This reset link is missing its token. Request a new one from
                  the sign-in page.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="text-sm text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : done ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Your password has been reset. You can now sign in with your
                  new password.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="text-sm text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5">
                {errorMessage && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
                    {errorMessage}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full gradient-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                      Resetting...
                    </>
                  ) : (
                    "Reset password"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
