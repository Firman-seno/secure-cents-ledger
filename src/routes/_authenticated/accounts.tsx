import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts, useDeleteAccount, useProfile, useSaveAccount, useTransactions } from "@/lib/queries";
import {
  ACCOUNT_TYPES,
  balanceForAccount,
  formatMoney,
  type Account,
  type AccountType,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/accounts")({
  component: AccountsPage,
});

function AccountsPage() {
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const { data: profile } = useProfile();
  const currency = profile?.currency ?? "USD";
  const save = useSaveAccount();
  const del = useDeleteAccount();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [initial, setInitial] = useState("0");

  function startCreate() {
    setEditing(null);
    setName("");
    setType("bank");
    setInitial("0");
    setOpen(true);
  }

  function startEdit(a: Account) {
    setEditing(a);
    setName(a.account_name);
    setType(a.account_type);
    setInitial(String(a.initial_balance));
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 1) return toast.error("Account name is required.");
    const initialNum = Number(initial);
    if (!Number.isFinite(initialNum)) return toast.error("Initial balance must be a number.");
    try {
      await save.mutateAsync({
        id: editing?.id,
        account_name: name.trim(),
        account_type: type,
        initial_balance: initialNum,
      });
      toast.success(editing ? "Account updated." : "Account created.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the account.");
    }
  }

  async function onDelete(a: Account) {
    if (
      !window.confirm(
        `Delete "${a.account_name}"? All transactions linked to it will be removed too.`,
      )
    )
      return;
    try {
      await del.mutateAsync(a.id);
      toast.success("Account deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the account.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Accounts"
        description="Your bank, cash and e-wallet sources of funds."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={startCreate}>
                <Plus className="size-4" /> New account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit account" : "New account"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="acc-name">Account name</Label>
                  <Input
                    id="acc-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="BCA, Cash, DANA…"
                    maxLength={60}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Account type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="acc-initial">Initial balance</Label>
                  <Input
                    id="acc-initial"
                    type="number"
                    step="0.01"
                    value={initial}
                    onChange={(e) => setInitial(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save account"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {accounts.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No accounts yet. Create your first one to start tracking.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <div key={a.id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{a.account_name}</p>
                  <p className="text-xs text-muted-foreground uppercase">
                    {ACCOUNT_TYPES.find((t) => t.value === a.account_type)?.label}
                  </p>
                </div>
                <div className="flex">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(a)} aria-label="Edit">
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(a)} aria-label="Delete">
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight">
                {formatMoney(balanceForAccount(a, transactions), currency)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Opening balance {formatMoney(Number(a.initial_balance), currency)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
