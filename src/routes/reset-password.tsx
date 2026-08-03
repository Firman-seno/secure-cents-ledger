import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — Kelola" },
      { name: "description", content: "Choose a new password for your Kelola account." },
      { property: "og:title", content: "Reset password — Kelola" },
      { property: "og:description", content: "Choose a new password for your Kelola account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let done = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
        done = true;
        setStatus("ready");
      }
    });

    (async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

      const errDesc = url.searchParams.get("error_description") ?? hash.get("error_description");
      if (errDesc) {
        setLinkError(decodeURIComponent(errDesc));
        setStatus("invalid");
        return;
      }

      // PKCE style link: ?code=...
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setLinkError(error.message);
          setStatus("invalid");
          return;
        }
        window.history.replaceState({}, "", url.pathname);
        setStatus("ready");
        return;
      }

      // Implicit style link: #access_token=...&refresh_token=...
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          setLinkError(error.message);
          setStatus("invalid");
          return;
        }
        window.history.replaceState({}, "", url.pathname);
        setStatus("ready");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setStatus("ready");
        return;
      }
      // Give onAuthStateChange a moment to deliver the recovery session.
      setTimeout(() => {
        if (!done) setStatus((s) => (s === "ready" ? s : "invalid"));
      }, 1200);
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    if (password !== String(form.get("confirm"))) return toast.error("Passwords do not match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="surface-card w-full max-w-md p-6">
        <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>

        {status === "checking" ? (
          <p className="mt-3 text-sm text-muted-foreground">Checking your reset link…</p>
        ) : null}

        {status === "invalid" ? (
          <div className="mt-3 grid gap-3">
            <p className="text-sm text-muted-foreground">
              {linkError ??
                "This reset link is invalid or has expired. Request a new one and open the newest email."}
            </p>
            <Button asChild variant="outline">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          </div>
        ) : null}

        {status === "ready" ? (
          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" name="confirm" type="password" required minLength={6} />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
