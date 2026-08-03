import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSaveProfile } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useProfile();
  const save = useSaveProfile();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (profile) setFullName(profile.full_name ?? "");
  }, [profile]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (fullName.trim().length < 2) return toast.error("Please enter your full name.");
    try {
      await save.mutateAsync({ full_name: fullName.trim() });
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update your profile.");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    setPassword("");
    setConfirm("");
    toast.success("Password changed.");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Profile" description="Your account details." />

      <form onSubmit={saveName} className="surface-card grid gap-4 p-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={profile?.email ?? ""} disabled />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} />
        </div>
        <Button type="submit" disabled={save.isPending} className="justify-self-start">
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <form onSubmit={changePassword} className="surface-card mt-6 grid gap-4 p-6">
        <h2 className="font-semibold">Change password</h2>
        <div className="grid gap-2">
          <Label htmlFor="new-pass">New password</Label>
          <PasswordInput
            id="new-pass"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm-pass">Confirm new password</Label>
          <PasswordInput
            id="confirm-pass"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" variant="outline" className="justify-self-start">
          Update password
        </Button>
      </form>
    </div>
  );
}
