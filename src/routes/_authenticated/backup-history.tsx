import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { BackupButton } from "@/components/BackupDialog";
import {
  useBackupHistory,
  useClearBackupHistory,
  useDeleteBackupHistory,
} from "@/lib/backup-queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/backup-history")({
  component: BackupHistoryPage,
  head: () => ({
    meta: [
      { title: "Backup History — Kelola" },
      {
        name: "description",
        content: "Review every Google Sheets backup: date, row count, range, status and duration.",
      },
      { property: "og:title", content: "Backup History — Kelola" },
      {
        property: "og:description",
        content: "Review every Google Sheets backup run from your Kelola finance app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const SCOPE_LABEL: Record<string, string> = {
  all: "All data",
  filtered: "Current filter",
  this_month: "This month",
  month: "Specific month",
  range: "Date range",
  auto: "Auto backup",
};

function BackupHistoryPage() {
  const { data: history = [], isLoading } = useBackupHistory();
  const remove = useDeleteBackupHistory();
  const clear = useClearBackupHistory();

  async function removeOne(id: string) {
    try {
      await remove.mutateAsync(id);
      toast.success("Backup record deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete this record.");
    }
  }

  async function clearAll() {
    if (!window.confirm("Delete all backup history? Your spreadsheet data stays untouched.")) return;
    try {
      await clear.mutateAsync();
      toast.success("Backup history cleared.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not clear the history.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Backup history"
        description="Every backup sent to your Google Spreadsheet."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={clearAll}
              disabled={history.length === 0 || clear.isPending}
            >
              <Trash2 className="size-4" /> Clear all
            </Button>
            <BackupButton />
          </div>
        }
      />

      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Backup date</TableHead>
              <TableHead>Rows</TableHead>
              <TableHead>Range</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((h) => (
              <TableRow key={h.id}>
                <TableCell>{new Date(h.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  {h.row_count}
                  {h.skipped_count ? (
                    <span className="text-muted-foreground"> (+{h.skipped_count} skipped)</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {h.range_from || h.range_to
                    ? `${h.range_from ?? "…"} → ${h.range_to ?? "…"}`
                    : (SCOPE_LABEL[h.scope] ?? h.scope)}
                </TableCell>
                <TableCell>
                  <Badge variant={h.status === "success" ? "secondary" : "destructive"}>
                    {h.status === "success" ? "Success" : "Failed"}
                  </Badge>
                  {h.error_message ? (
                    <p className="mt-1 text-xs text-muted-foreground">{h.error_message}</p>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">{(h.duration_ms / 1000).toFixed(1)}s</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete backup record"
                    onClick={() => removeOne(h.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {isLoading ? "Loading…" : "No backups yet."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
