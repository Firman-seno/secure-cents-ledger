import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts, useProfile, useSaveProfile, useTransactions } from "@/lib/queries";
import { TYPE_LABEL } from "@/lib/finance";
import { BackupSettingsCard } from "@/components/BackupSettingsCard";


export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const CURRENCIES = ["USD", "EUR", "GBP", "IDR", "SGD", "AUD", "JPY", "INR"];

function SettingsPage() {
  const { data: profile } = useProfile();
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const save = useSaveProfile();

  const [currency, setCurrency] = useState("USD");
  const [overdraft, setOverdraft] = useState(false);

  useEffect(() => {
    if (profile) {
      setCurrency(profile.currency ?? "USD");
      setOverdraft(!!profile.allow_overdraft);
    }
  }, [profile]);

  async function update(patch: { currency?: string; allow_overdraft?: boolean }) {
    try {
      await save.mutateAsync(patch);
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings.");
    }
  }

  function exportCsv() {
    const nameOf = (id: string | null) =>
      accounts.find((a) => a.id === id)?.account_name ?? "";
    const header = [
      "date",
      "type",
      "account",
      "to_account",
      "category",
      "description",
      "payment_method",
      "amount",
      "fee",
    ];
    const rows = transactions.map((t) => [
      t.transaction_date,
      TYPE_LABEL[t.transaction_type],
      nameOf(t.account_id),
      nameOf(t.to_account_id),
      t.category ?? "",
      t.description ?? "",
      t.payment_method ?? "",
      String(t.amount),
      String(t.fee),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader title="Settings" description="Preferences for how the app behaves." />


      <div className="surface-card grid gap-6 p-6">
        <div className="grid gap-2">
          <Label>Currency</Label>
          <Select
            value={currency}
            onValueChange={(v) => {
              setCurrency(v);
              update({ currency: v });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Used to format every amount across the app.
          </p>
        </div>

        <div className="flex items-start justify-between gap-6 border-t border-border pt-6">
          <div>
            <Label htmlFor="overdraft">Allow negative balances</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              When off, the app blocks a transaction that would push an account below zero.
            </p>
          </div>
          <Switch
            id="overdraft"
            checked={overdraft}
            onCheckedChange={(v) => {
              setOverdraft(v);
              update({ allow_overdraft: v });
            }}
          />
        </div>

        <div className="border-t border-border pt-6">
          <Label>Export data</Label>
          <p className="mt-1 mb-3 text-xs text-muted-foreground">
            Download all of your transactions as a CSV file.
          </p>
          <Button variant="outline" onClick={exportCsv} disabled={transactions.length === 0}>
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </div>

      <BackupSettingsCard />
    </div>

  );
}
