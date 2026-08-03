import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Mail, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Forgot password — Kelola Personal Finance" },
      {
        name: "description",
        content: "Request a password reset link for your Kelola account.",
      },
      { property: "og:title", content: "Forgot password — Kelola Personal Finance" },
      {
        property: "og:description",
        content: "Request a password reset link for your Kelola account.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return toast.error("Please enter your email address.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return toast.error("Please enter a valid email address.");
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(value, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(
          friendlyAuthError(error, "We couldn't send the reset link. Please try again."),
        );
        return;
      }
      setSentTo(value);
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
          {sentTo ? (
            <div className="grid gap-4 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
                <Mail className="size-6" />
              </span>
              <div className="grid gap-1">
                <h1 className="text-xl font-semibold tracking-tight">Check your inbox</h1>
                <p className="text-sm text-muted-foreground">
                  We sent a password reset link to{" "}
                  <span className="font-medium text-foreground">{sentTo}</span>. Please check
                  your inbox or spam folder. The link expires after a short time.
                </p>
              </div>
              <Button asChild>
                <Link to="/auth">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-1">
                <h1 className="text-xl font-semibold tracking-tight">Forgot your password?</h1>
                <p className="text-sm text-muted-foreground">
                  Enter the email address linked to your account and we&apos;ll send you a link
                  to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Sending…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link to="/auth" className="font-medium text-primary underline-offset-4 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
