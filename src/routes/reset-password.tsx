import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — Kelola Personal Finance" },
      {
        name: "description",
        content: "Choose a new password for your Kelola account.",
      },
      { property: "og:title", content: "Reset password — Kelola Personal Finance" },
      {
        property: "og:description",
        content: "Choose a new password for your Kelola account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

type Status = "checking" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    let cancelled = false;
    let recoveryFired = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session && !cancelled) {
        recoveryFired = true;
        setStatus("ready");
      }
    });

    (async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const rawError =
        url.searchParams.get("error_description") ??
        hash.get("error_description") ??
        url.searchParams.get("error_code") ??
        hash.get("error_code") ??
        url.searchParams.get("error") ??
        hash.get("error");

      if (rawError) {
        setLinkError(
          friendlyAuthError(
            { message: decodeURIComponent(rawError) },
            "This reset link is invalid or has expired. Please request a new one.",
          ),
        );
        setStatus("invalid");
        return;
      }

      const code = url.searchParams.get("code");
      const hasLink =
        Boolean(code) ||
        hash.has("access_token") ||
        hash.get("type") === "recovery" ||
        url.searchParams.get("type") === "recovery";

      if (hasLink) {
        // PKCE links (/?code=...) are only auto-processed by supabase-js when the
        // matching code verifier exists in this browser's storage. If it doesn't
        // (e.g. the link was opened in a different browser/device), exchange the
        // code manually.
        if (code) {
          const projectRef = new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split(".")[0];
          const hasVerifier = localStorage.getItem(`sb-${projectRef}-auth-token-code-verifier`) != null;
          if (!hasVerifier) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              setLinkError(
                friendlyAuthError(
                  error,
                  "This reset link is invalid or has expired. Please request a new one.",
                ),
              );
              setStatus("invalid");
              return;
            }
            window.history.replaceState({}, "", url.pathname);
            setStatus("ready");
            return;
          }
        }

        // supabase-js detects and processes the recovery URL automatically
        // (PKCE code exchange or implicit tokens) and fires PASSWORD_RECOVERY.
        // Give it a moment to complete the network round-trip.
        for (let i = 0; i < 24; i++) {
          if (cancelled) return;
          if (recoveryFired) return;
          await new Promise((r) => setTimeout(r, 500));
        }
        if (cancelled) return;
        // Fallback: the recovery session may already be persisted (e.g. refresh).
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setStatus("ready");
          return;
        }
        setLinkError(
          "This reset link is invalid or has expired. Please request a new one.",
        );
        setStatus("invalid");
        return;
      }

      // Direct visit without a link — only useful if a recovery session exists.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setStatus("ready");
        return;
      }
      setLinkError(
        "This reset link is invalid or has expired. Please request a new one.",
      );
      setStatus("invalid");
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (status !== "done") return;
    if (countdown <= 0) {
      navigate({ to: "/auth" });
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, countdown, navigate]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors: { password?: string; confirm?: string } = {};
    if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }
    if (confirm.length === 0) {
      errors.confirm = "Please confirm your new password.";
    } else if (password !== confirm) {
      errors.confirm = "Passwords do not match.";
    }
    setFieldErrors(errors);
    if (errors.password || errors.confirm) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(
          friendlyAuthError(error, "We couldn't update your password. Please try again."),
        );
        return;
      }
      toast.success("Password updated. You can now sign in with your new password.");
      // Best effort: end the recovery session so the user signs in fresh.
      await supabase.auth.signOut().catch(() => undefined);
      setStatus("done");
      setCountdown(5);
    } catch {
      toast.error("Network error. Please check your connection and try again.");
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

        <div className="surface-card p-6">
          {status === "checking" ? (
            <div className="grid justify-items-center gap-3 py-8 text-center">
              <span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Checking your reset link…</p>
            </div>
          ) : null}

          {status === "invalid" ? (
            <div className="grid gap-4 py-2 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <KeyRound className="size-6" />
              </span>
              <div className="grid gap-1">
                <h1 className="text-xl font-semibold tracking-tight">Invalid reset link</h1>
                <p className="text-sm text-muted-foreground">
                  {linkError ??
                    "This reset link is invalid or has expired. Please request a new one."}
                </p>
              </div>
              <Button asChild>
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/auth">Back to sign in</Link>
              </Button>
            </div>
          ) : null}

          {status === "done" ? (
            <div className="grid gap-4 py-2 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
                <ShieldCheck className="size-6" />
              </span>
              <div className="grid gap-1">
                <h1 className="text-xl font-semibold tracking-tight">Password updated</h1>
                <p className="text-sm text-muted-foreground">
                  Your password has been updated successfully. You can now sign in with your
                  new password.
                </p>
              </div>
              <Button asChild>
                <Link to="/auth">Login now</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Redirecting to sign in in {countdown} second{countdown === 1 ? "" : "s"}…
              </p>
            </div>
          ) : null}

          {status === "ready" ? (
            <div className="grid gap-4">
              <div className="grid gap-1">
                <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>
                <p className="text-sm text-muted-foreground">
                  Choose a strong password you haven&apos;t used before.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
                <div className="grid gap-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    placeholder="At least 8 characters"
                    required
                    autoComplete="new-password"
                  />
                  {fieldErrors.password ? (
                    <p className="text-sm text-destructive">{fieldErrors.password}</p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      if (fieldErrors.confirm) {
                        setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
                      }
                    }}
                    placeholder="Repeat your new password"
                    required
                    autoComplete="new-password"
                  />
                  {fieldErrors.confirm ? (
                    <p className="text-sm text-destructive">{fieldErrors.confirm}</p>
                  ) : null}
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Updating…
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                <Link to="/auth" className="font-medium text-primary underline-offset-4 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
