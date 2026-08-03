import { DatabaseBackup, History, ShieldCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { BackupButton } from "@/components/BackupDialog";

export function BackupSettingsCard() {
  return (
    <div className="surface-card grid gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <DatabaseBackup className="size-5 text-primary" /> Database backup
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Backup relasional aktif dan tidak bergantung pada Google Spreadsheet.
          </p>
        </div>
        <BackupButton variant="outline" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          [ShieldCheck, "Otomatis", "Create, update, dan delete dicatat seketika."],
          [History, "Dapat dipulihkan", "Versi data dapat direstore dari Backup History."],
          [DatabaseBackup, "Tanpa duplikat", "Snapshot memakai identitas record yang unik."],
        ].map(([Icon, title, text]) => (
          <div key={String(title)} className="rounded-md border border-border p-4">
            <Icon className="size-5 text-primary" />
            <Label className="mt-3 block">{String(title)}</Label>
            <p className="mt-1 text-xs text-muted-foreground">{String(text)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
