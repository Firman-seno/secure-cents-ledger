import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — Kelola Personal Finance" },
      {
        name: "description",
        content: "Choose a new password for your Kelola account using your secure email reset link.",
      },
      { property: "og:title", content: "Set a new password — Kelola Personal Finance" },
      {
        property: "og:description",
        content: "Complete your Kelola password reset and get back to managing your money.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

type Status = "verifying" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function establishSession() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

      const errorDescription = url.searchParams.get("error_description") ?? hash.get("error_description");
      if (errorDescription) {
        if (cancelled) return;
        setStatus("invalid");
        setMessage(errorDescription);
        return;
      }

      // PKCE style link: ?code=...
      const code = url.searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && exchangeError) {
          setStatus("invalid");
          setMessage(exchangeError.message);
          return;
        }
      }

      // Implicit style link: #access_token=...&refresh_token=...
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (!code && accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!cancelled && sessionError) {
          setStatus("invalid");
          setMessage(sessionError.message);
          return;
        }
      }

      // Token hash style link: ?token_hash=...&type=recovery
      const tokenHash = url.searchParams.get("token_hash") ?? hash.get("token_hash");
      if (!code && !accessToken && tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        if (!cancelled && verifyError) {
          setStatus("invalid");
          setMessage(verifyError.message);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        window.history.replaceState({}, "", "/reset-password");
        setStatus("ready");
      } else {
        setStatus("invalid");
        setMessage("This reset link is invalid or has expired. Please request a new one.");
      }
    }

    void establishSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setStatus("done");
      toast.success("Password updated. Please sign in again.");
      await supabase.auth.signOut();
      setTimeout(() => {
        void navigate({ to: "/auth" });
      }, 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update password.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="brand-gradient flex size-9 items-center justify-center rounded-lg text-primary-foreground">
            <Wallet className="size-5" />
          </span>
          <span className="text-xl font-semibold tracking-tight">Kelola</span>
        </Link>

        <div className="surface-card grid gap-5 p-6 backdrop-blur-xl">
          <div className="grid justify-items-center gap-3 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              {status === "done" ? <ShieldCheck className="size-6" /> : <KeyRound className="size-6" />}
            </span>
            <div className="grid gap-1">
              <h1 className="text-xl font-semibold tracking-tight">
                {status === "done" ? "Password updated" : "Set a new password"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {status === "verifying"
                  ? "Verifying your reset link…"
                  : status === "invalid"
                    ? (message ?? "This reset link is invalid or has expired.")
                    : status === "done"
                      ? "You can now sign in with your new password."
                      : "Choose a strong password you haven't used before."}
              </p>
            </div>
          </div>

          {status === "verifying" ? (
            <div className="flex justify-center py-4 text-muted-foreground">
              <Spinner />
            </div>
          ) : null}

          {status === "ready" ? (
            <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
              <div className="grid gap-2">
                <Label htmlFor="new-password">New password</Label>
                <PasswordInput
                  id="new-password"
                  value={password}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirm}
                  autoComplete="new-password"
                  placeholder="Repeat your new password"
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setError(null);
                  }}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Spinner />
                    Updating…
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          ) : null}

          {status === "invalid" ? (
            <Button asChild className="w-full">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          ) : null}

          {status === "done" ? (
            <Button asChild className="w-full">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/auth" className="font-medium text-primary underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
