import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currentMonth, monthOptions, monthRange } from "@/lib/backup";
import { runBackup } from "@/lib/backup-run";
import { useBackedUpIds, useBackupSettings } from "@/lib/backup-queries";
import { useAccounts, useProfile, useTransactions } from "@/lib/queries";
import { inRange } from "@/lib/finance";

type Scope = "filtered" | "all" | "this_month" | "month" | "range";

export function BackupButton({
  filteredTransactions,
  variant = "default",
}: {
  filteredTransactions?: import("@/lib/finance").Transaction[];
  variant?: "default" | "outline";
}) {
  const qc = useQueryClient();
  const { data: settings } = useBackupSettings();
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const { data: profile } = useProfile();
  const { data: backedUp } = useBackedUpIds();

  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>(filteredTransactions ? "filtered" : "all");
  const [month, setMonth] = useState(currentMonth());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);

  const months = useMemo(() => monthOptions(transactions), [transactions]);

  const selection = useMemo(() => {
    if (scope === "filtered" && filteredTransactions) return filteredTransactions;
    if (scope === "all") return transactions;
    if (scope === "this_month") {
      const r = monthRange(currentMonth());
      return transactions.filter((t) => inRange(t, r.from, r.to));
    }
    if (scope === "month") {
      const r = monthRange(month);
      return transactions.filter((t) => inRange(t, r.from, r.to));
    }
    return transactions.filter((t) => inRange(t, from || undefined, to || undefined));
  }, [scope, filteredTransactions, transactions, month, from, to]);

  const pendingCount = skipDuplicates
    ? selection.filter((t) => !backedUp?.has(t.id)).length
    : selection.length;

  const configured =
    !!settings?.form_action_url &&
    Object.values(settings?.entry_map ?? {}).filter(Boolean).length > 0;

  async function start() {
    if (!settings) return;
    setProgress(0);
    try {
      const range =
        scope === "month"
          ? monthRange(month)
          : scope === "this_month"
            ? monthRange(currentMonth())
            : { from: from || null, to: to || null };
      const result = await runBackup({
        settings,
        transactions: selection,
        allTransactions: transactions,
        accounts,
        createdBy: profile?.email ?? profile?.full_name ?? "",
        skipIds: skipDuplicates ? backedUp : undefined,
        scope,
        from: range.from ?? null,
        to: range.to ?? null,
        onProgress: setProgress,
      });
      qc.invalidateQueries({ queryKey: ["backup-history"] });
      qc.invalidateQueries({ queryKey: ["backup-records"] });
      if (result.failed > 0) {
        toast.error(`❌ Backup gagal untuk ${result.failed} transaksi. Silakan coba lagi.`);
      } else {
        toast.success(`✅ ${result.sent} transaksi berhasil dibackup ke Google Spreadsheet.`);
        setOpen(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "❌ Backup gagal. Silakan coba lagi.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (progress === null ? setOpen(v) : null)}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <FileSpreadsheet className="size-4" /> Backup to Google Sheets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Backup to Google Sheets</DialogTitle>
          <DialogDescription>
            Transactions are sent to your Google Form, which stores them in the linked spreadsheet.
          </DialogDescription>
        </DialogHeader>

        {!configured ? (
          <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Set your Google Form action URL and entry IDs in <strong>Settings</strong> first.
          </p>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>What to back up</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filteredTransactions ? (
                    <SelectItem value="filtered">Current filter</SelectItem>
                  ) : null}
                  <SelectItem value="all">All data</SelectItem>
                  <SelectItem value="this_month">This month</SelectItem>
                  <SelectItem value="month">Specific month</SelectItem>
                  <SelectItem value="range">Date range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scope === "month" ? (
              <div className="grid gap-2">
                <Label>Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {scope === "range" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="bfrom">From</Label>
                  <Input
                    id="bfrom"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bto">To</Label>
                  <Input id="bto" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
            ) : null}

            <label className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={skipDuplicates}
                onCheckedChange={(v) => setSkipDuplicates(v === true)}
              />
              Skip duplicate transactions
            </label>

            <p className="text-sm text-muted-foreground">
              {pendingCount} of {selection.length} transactions will be sent.
            </p>

            {progress !== null ? (
              <div className="grid gap-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={progress !== null}>
            Cancel
          </Button>
          <Button onClick={start} disabled={!configured || progress !== null || pendingCount === 0}>
            {progress !== null ? <Loader2 className="size-4 animate-spin" /> : null}
            Start backup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
