import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import axios from "axios";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold text-primary-foreground">
              CP
            </span>
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            {sent ? "Check your email" : "Reset your password"}
          </h1>
          {!sent && (
            <p className="text-sm text-muted-foreground">
              We'll send a link to reset your password
            </p>
          )}
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="pt-6 pb-8 px-8">
            {sent ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
                <p className="text-sm text-muted-foreground">
                  If <strong>{email}</strong> is registered, a reset link has
                  been sent. It expires in 1 hour.
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
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
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
                      Sending...
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
