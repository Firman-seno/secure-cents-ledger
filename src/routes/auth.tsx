import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Mail, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { friendlyAuthError } from "@/lib/auth-errors";
import { isValidIndonesianPhone, normalizePhone } from "@/lib/phone";


export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Kelola Personal Finance" },
      {
        name: "description",
        content:
          "Sign in or create your free Kelola account to track income, expenses, ATM withdrawals and transfers.",
      },
      { property: "og:title", content: "Sign in — Kelola Personal Finance" },
      {
        property: "og:description",
        content: "Secure access to your private personal finance dashboard.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    setLoading(false);
    if (error) return toast.error(friendlyAuthError(error, "Sign in failed. Please check your email and password."));
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("full_name")).trim();
    const password = String(form.get("password"));
    const phone = String(form.get("phone") ?? "").trim();
    if (fullName.length < 2) return toast.error("Please enter your full name.");
    if (!isValidIndonesianPhone(phone)) {
      return toast.error("Please enter a valid Indonesian WhatsApp number (e.g. 08123456789).");
    }
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: String(form.get("email")).trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, phone: normalizePhone(phone) },
      },
    });
    setLoading(false);
    if (error) return toast.error(friendlyAuthError(error, "We couldn't create your account. Please try again."));
    toast.success("Account created. You can sign in now.");
    setMode("login");
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
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="login-password">Password</Label>
                  <PasswordInput
                    id="login-password"
                    name="password"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
                <Link
                  to="/forgot-password"
                  className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleRegister} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="reg-name">Full name</Label>
                  <Input id="reg-name" name="full_name" required autoComplete="name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reg-phone">WhatsApp number</Label>
                  <Input
                    id="reg-phone"
                    name="phone"
                    inputMode="tel"
                    required
                    autoComplete="tel"
                    placeholder="08xxxxxxxxxx"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to reset your password via WhatsApp OTP.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <PasswordInput
                    id="reg-password"
                    name="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
