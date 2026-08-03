import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { BackupButton } from "@/components/BackupDialog";
import {
  useBackupHistory,
  useClearBackupHistory,
  useDeleteBackupHistory,
  useBackupEvents,
  useRestoreBackupEvent,
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
        content: "Review automatic database backups and restore previous Kelola data versions.",
      },
      { property: "og:title", content: "Backup History — Kelola" },
      {
        property: "og:description",
        content: "Review automatic database backup activity in Kelola.",
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
  const { data: events = [] } = useBackupEvents();
  const restore = useRestoreBackupEvent();

  async function removeOne(id: string) {
    try {
      await remove.mutateAsync(id);
      toast.success("Backup record deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete this record.");
    }
  }

  async function clearAll() {
    if (!window.confirm("Delete all backup history entries? Saved data versions remain available.")) return;
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
        description="Automatic database audit, snapshots, and restore points."
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
      <div className="mt-6 surface-card overflow-x-auto">
        <div className="border-b border-border p-5">
          <h2 className="font-semibold">Data versions</h2>
          <p className="mt-1 text-sm text-muted-foreground">Latest 250 protected versions from accounts, transactions, profile, and settings.</p>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Table</TableHead><TableHead>Action</TableHead><TableHead>Record</TableHead><TableHead className="text-right">Restore</TableHead></TableRow></TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="whitespace-nowrap">{new Date(event.created_at).toLocaleString()}</TableCell>
                <TableCell>{event.entity_type}</TableCell>
                <TableCell><Badge variant="secondary">{event.operation}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{event.record_id.slice(0, 8)}…</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" disabled={restore.isPending} aria-label="Restore this version" onClick={async () => { if (!window.confirm("Restore this data version?")) return; try { await restore.mutateAsync(event.id); toast.success("Data version restored."); } catch (err) { toast.error(err instanceof Error ? err.message : "Restore failed."); } }}><RotateCcw className="size-4" /></Button></TableCell>
              </TableRow>
            ))}
            {events.length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No data versions yet.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
