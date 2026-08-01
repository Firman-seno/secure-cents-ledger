import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BACKUP_FIELDS, type EntryMap } from "@/lib/backup";
import { useBackupSettings, useSaveBackupSettings } from "@/lib/backup-queries";
import { BackupButton } from "@/components/BackupDialog";

export function BackupSettingsCard() {
  const { data: settings } = useBackupSettings();
  const save = useSaveBackupSettings();

  const [formUrl, setFormUrl] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [entryMap, setEntryMap] = useState<EntryMap>({});
  const [autoBackup, setAutoBackup] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setFormUrl(settings.form_url ?? "");
    setActionUrl(settings.form_action_url ?? "");
    setEntryMap(settings.entry_map ?? {});
    setAutoBackup(!!settings.auto_backup);
  }, [settings]);

  async function persist(patch: Parameters<typeof save.mutateAsync>[0]) {
    try {
      await save.mutateAsync(patch);
      toast.success("Backup settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save backup settings.");
    }
  }

  function autoFillAction(value: string) {
    setFormUrl(value);
    if (!actionUrl && value.includes("/viewform")) {
      setActionUrl(value.split("?")[0]!.replace("/viewform", "/formResponse"));
    }
  }

  return (
    <div className="surface-card grid gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileSpreadsheet className="size-5 text-primary" /> Google Sheets backup
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send your transactions to a Google Form so they are stored in the linked spreadsheet.
          </p>
        </div>
        <BackupButton variant="outline" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="form-url">Google Form URL</Label>
        <Input
          id="form-url"
          value={formUrl}
          onChange={(e) => autoFillAction(e.target.value)}
          onBlur={() => persist({ form_url: formUrl, form_action_url: actionUrl })}
          placeholder="https://docs.google.com/forms/d/e/xxxx/viewform"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="action-url">Google Form Action URL</Label>
        <Input
          id="action-url"
          value={actionUrl}
          onChange={(e) => setActionUrl(e.target.value)}
          onBlur={() => persist({ form_action_url: actionUrl })}
          placeholder="https://docs.google.com/forms/d/e/xxxx/formResponse"
        />
      </div>

      <div className="grid gap-3 border-t border-border pt-6">
        <div>
          <Label>Entry ID mapping</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste the <code>entry.xxxxx</code> id of each Google Form question. Leave blank to skip
            a column.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {BACKUP_FIELDS.map((field) => (
            <div key={field.key} className="grid gap-1.5">
              <Label htmlFor={`entry-${field.key}`} className="text-xs font-normal">
                {field.label}
              </Label>
              <Input
                id={`entry-${field.key}`}
                value={entryMap[field.key] ?? ""}
                onChange={(e) => setEntryMap((m) => ({ ...m, [field.key]: e.target.value }))}
                placeholder="entry.123456789"
              />
            </div>
          ))}
        </div>
        <div>
          <Button
            variant="outline"
            onClick={() => persist({ entry_map: entryMap })}
            disabled={save.isPending}
          >
            Save mapping
          </Button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-6 border-t border-border pt-6">
        <div>
          <Label htmlFor="auto-backup">Auto backup</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Automatically send every new transaction to Google Sheets right after it is saved.
          </p>
        </div>
        <Switch
          id="auto-backup"
          checked={autoBackup}
          onCheckedChange={(v) => {
            setAutoBackup(v);
            persist({ auto_backup: v });
          }}
        />
      </div>
    </div>
  );
}
