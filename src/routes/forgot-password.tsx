import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { MailCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Forgot password — Kelola Personal Finance" },
      {
        name: "description",
        content: "Reset your Kelola password with a secure link sent to your email address.",
      },
      { property: "og:title", content: "Forgot password — Kelola Personal Finance" },
      {
        property: "og:description",
        content: "Request a password reset link for your Kelola account by email.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

function StepShell({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid animate-in gap-5 fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid justify-items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          {icon}
        </span>
        <div className="grid gap-1">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink(target: string) {
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (sendError) throw sendError;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const target = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendLink(target);
      setSent(true);
      toast.success("Reset link sent. Please check your inbox.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send reset email.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    try {
      await sendLink(email.trim().toLowerCase());
      toast.success("Reset link sent again.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend email.");
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

        <div className="surface-card p-6 backdrop-blur-xl">
          {sent ? (
            <StepShell
              icon={<MailCheck className="size-6" />}
              title="Check your email"
              subtitle={`We sent a password reset link to ${email}. Open it on this device to set a new password.`}
            >
              <div className="grid gap-3">
                <Button variant="outline" onClick={handleResend} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Spinner />
                      Resending…
                    </>
                  ) : (
                    "Resend email"
                  )}
                </Button>
                <Button asChild className="w-full">
                  <Link to="/auth">Back to sign in</Link>
                </Button>
              </div>
            </StepShell>
          ) : (
            <StepShell
              icon={<MailCheck className="size-6" />}
              title="Forgot Password"
              subtitle="Enter your registered email and we'll send you a reset link."
            >
              <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
                <div className="grid gap-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    autoFocus
                  />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Spinner />
                      Sending link…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>
            </StepShell>
          )}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link to="/auth" className="font-medium text-primary underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
