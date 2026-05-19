import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "text-success" : ""}`}>
      <Check className={`h-3 w-3 ${ok ? "opacity-100" : "opacity-30"}`} />
      {text}
    </li>
  );
}

export default function SecurityTab() {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      const res = await api.patch("/auth/change-password", payload);
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been changed.",
      });
      setCurrent("");
      setNext("");
      setConfirm("");
    },
    onError: (err: any) =>
      toast({
        title: "Could not change password",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const minLen = next.length >= 8;
  const hasNumber = /\d/.test(next);
  const hasUpper = /[A-Z]/.test(next);
  const matches = next.length > 0 && next === confirm;
  const canSubmit = !!(
    current &&
    minLen &&
    hasNumber &&
    hasUpper &&
    matches &&
    !mutation.isPending
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change password</CardTitle>
        <CardDescription>
          Use a strong password you don't reuse elsewhere.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-lg">
        {/* Current password */}
        <div className="space-y-2">
          <Label>Current password</Label>
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* New password */}
        <div className="space-y-2">
          <Label>New password</Label>
          <Input
            type={show ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </div>

        {/* Confirm */}
        <div className="space-y-2">
          <Label>Confirm new password</Label>
          <Input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {/* Rules */}
        <ul className="text-xs space-y-1 text-muted-foreground">
          <Rule ok={minLen} text="At least 8 characters" />
          <Rule ok={hasUpper} text="At least one uppercase letter" />
          <Rule ok={hasNumber} text="At least one number" />
          <Rule ok={matches} text="Passwords match" />
        </ul>

        <div className="flex justify-end pt-2">
          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            disabled={!canSubmit}
            onClick={() =>
              mutation.mutate({
                currentPassword: current,
                newPassword: next,
                confirmPassword: confirm,
              })
            }
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating...
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
