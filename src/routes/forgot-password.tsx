import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound, MessageCircle, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  checkPasswordStrength,
  isValidIndonesianPhone,
  maskPhone,
  normalizePhone,
} from "@/lib/phone";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Forgot password — Kelola Personal Finance" },
      {
        name: "description",
        content: "Reset your Kelola password with a one-time code sent to your WhatsApp number.",
      },
      { property: "og:title", content: "Forgot password — Kelola Personal Finance" },
      {
        property: "og:description",
        content: "Reset your Kelola password with a WhatsApp OTP — no email required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

type Step = "phone" | "otp" | "password" | "done";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Network error. Please check your connection and try again.");
  }
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Something went wrong. Please try again.");
  return payload as T;
}

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

function formatCountdown(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(0);
  const [resendIn, setResendIn] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== "otp") return;
    const timer = setInterval(() => {
      setExpiresIn((v) => Math.max(0, v - 1));
      setResendIn((v) => Math.max(0, v - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  const passwordIssue = useMemo(() => {
    if (!password) return null;
    return checkPasswordStrength(password).message ?? null;
  }, [password]);

  const sendOtp = useCallback(
    async (silent = false) => {
      setError(null);
      setLoading(true);
      try {
        await postJson("/api/public/auth/forgot-password", { phone: normalizePhone(phone) });
        setExpiresIn(300);
        setResendIn(60);
        setOtp("");
        setStep("otp");
        if (!silent) toast.success(`OTP sent to ${maskPhone(phone)} on WhatsApp.`);
        else toast.success("A new OTP has been sent to your WhatsApp.");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [phone],
  );

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return setError("WhatsApp number is required.");
    if (!isValidIndonesianPhone(phone)) {
      return setError("Please enter a valid Indonesian WhatsApp number (e.g. 08123456789).");
    }
    await sendOtp();
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError("Please enter the 6-digit code.");
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/public/auth/verify-otp", { phone: normalizePhone(phone), otp });
      setStep("password");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid OTP.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    const strength = checkPasswordStrength(password);
    if (!strength.valid) return setError(strength.message ?? "Invalid password.");
    if (password !== confirm) return setError("Passwords do not match.");
    setError(null);
    setLoading(true);
    try {
      await postJson("/api/public/auth/reset-password", {
        phone: normalizePhone(phone),
        otp,
        password,
      });
      toast.success("Password updated successfully.");
      setStep("done");
      setTimeout(() => navigate({ to: "/auth" }), 1800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      toast.error(message);
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
          {step === "phone" ? (
            <StepShell
              icon={<MessageCircle className="size-6" />}
              title="Forgot Password"
              subtitle="Enter your registered WhatsApp number to receive an OTP code."
            >
              <form onSubmit={handlePhoneSubmit} className="grid gap-4" noValidate>
                <div className="grid gap-2">
                  <Label htmlFor="wa-number">WhatsApp Number</Label>
                  <Input
                    id="wa-number"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="08xxxxxxxxxx"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
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
                      Sending OTP…
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </form>
            </StepShell>
          ) : null}

          {step === "otp" ? (
            <StepShell
              icon={<ShieldCheck className="size-6" />}
              title="Verify OTP"
              subtitle="We have sent a verification code to your WhatsApp."
            >
              <form onSubmit={handleOtpSubmit} className="grid gap-4" noValidate>
                <div className="grid gap-2">
                  <Label htmlFor="otp-code">OTP Code</Label>
                  <Input
                    id="otp-code"
                    ref={otpRef}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="483921"
                    className="text-center text-lg tracking-[0.6em]"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setError(null);
                    }}
                  />
                  <p className="text-center text-sm text-muted-foreground">
                    Code expires in{" "}
                    <span className="font-medium text-foreground">{formatCountdown(expiresIn)}</span>
                  </p>
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" disabled={loading || expiresIn === 0} className="w-full">
                  {loading ? (
                    <>
                      <Spinner />
                      Verifying…
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || resendIn > 0}
                  onClick={() => void sendOtp(true)}
                >
                  {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
                </Button>
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setStep("phone");
                    setError(null);
                  }}
                >
                  Change WhatsApp number
                </button>
              </form>
            </StepShell>
          ) : null}

          {step === "password" ? (
            <StepShell
              icon={<KeyRound className="size-6" />}
              title="Reset Password"
              subtitle="Choose a new password for your Kelola account."
            >
              <form onSubmit={handlePasswordSubmit} className="grid gap-4" noValidate>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <PasswordInput
                    id="new-password"
                    value={password}
                    autoComplete="new-password"
                    placeholder="Min. 8 chars, upper, lower & number"
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                  />
                  {passwordIssue ? (
                    <p className="text-xs text-muted-foreground">{passwordIssue}</p>
                  ) : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
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
                    "Update Password"
                  )}
                </Button>
              </form>
            </StepShell>
          ) : null}

          {step === "done" ? (
            <StepShell
              icon={<ShieldCheck className="size-6" />}
              title="Password updated"
              subtitle="Password updated successfully. Redirecting you to sign in…"
            >
              <Button asChild className="w-full">
                <Link to="/auth">Back to sign in</Link>
              </Button>
            </StepShell>
          ) : null}

          {step !== "done" ? (
            <p className="mt-5 text-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <Link to="/auth" className="font-medium text-primary underline-offset-4 hover:underline">
                Back to sign in
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
