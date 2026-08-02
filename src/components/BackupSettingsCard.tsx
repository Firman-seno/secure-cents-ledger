import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BACKUP_FIELDS } from "@/lib/backup";
import { useBackupSettings, useSaveBackupSettings } from "@/lib/backup-queries";
import { BackupButton } from "@/components/BackupDialog";

const APPS_SCRIPT = `function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = body.sheet || 'Transactions';
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(body.headers);
    sheet.getRange(1, 1, 1, body.headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  var rows = body.rows.map(function (r) {
    return body.headers.map(function (h) { return r[h] || ''; });
  });
  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, body.headers.length).setValues(rows);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, inserted: rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export function BackupSettingsCard() {
  const { data: settings } = useBackupSettings();
  const save = useSaveBackupSettings();

  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [webAppUrl, setWebAppUrl] = useState("");
  const [sheetName, setSheetName] = useState("Transactions");
  const [autoBackup, setAutoBackup] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setSpreadsheetUrl(settings.spreadsheet_url ?? "");
    setWebAppUrl(settings.web_app_url ?? "");
    setSheetName(settings.sheet_name || "Transactions");
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

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT);
      toast.success("Script copied. Paste it into Apps Script.");
    } catch {
      toast.error("Could not copy. Select the script and copy it manually.");
    }
  }

  const connected = !!settings?.web_app_url;

  return (
    <div className="surface-card grid gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileSpreadsheet className="size-5 text-primary" /> Google Sheets backup
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your own Google Spreadsheet. Every backup is written straight into it, already
            split into the columns below.
          </p>
        </div>
        <BackupButton variant="outline" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sheet-url">Your spreadsheet link</Label>
        <div className="flex gap-2">
          <Input
            id="sheet-url"
            value={spreadsheetUrl}
            onChange={(e) => setSpreadsheetUrl(e.target.value)}
            onBlur={() => persist({ spreadsheet_url: spreadsheetUrl })}
            placeholder="https://docs.google.com/spreadsheets/d/xxxx/edit"
          />
          {spreadsheetUrl ? (
            <Button variant="outline" size="icon" asChild>
              <a href={spreadsheetUrl} target="_blank" rel="noreferrer" aria-label="Open spreadsheet">
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label>Connect the spreadsheet (one time)</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              In your spreadsheet: <strong>Extensions → Apps Script</strong>, paste the script,
              then <strong>Deploy → New deployment → Web app</strong>, set{" "}
              <em>Execute as: Me</em> and <em>Who has access: Anyone</em>, and copy the web app URL.
            </p>
          </div>
          <Button variant="outline" onClick={copyScript}>
            <Copy className="size-4" /> Copy script
          </Button>
        </div>
        <pre className="max-h-48 overflow-auto rounded-md bg-background p-3 text-xs leading-relaxed text-muted-foreground">
          {APPS_SCRIPT}
        </pre>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <div className="grid gap-2">
          <Label htmlFor="webapp-url">Apps Script web app URL</Label>
          <Input
            id="webapp-url"
            value={webAppUrl}
            onChange={(e) => setWebAppUrl(e.target.value)}
            onBlur={() => persist({ web_app_url: webAppUrl })}
            placeholder="https://script.google.com/macros/s/xxxx/exec"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sheet-tab">Sheet tab name</Label>
          <Input
            id="sheet-tab"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            onBlur={() => persist({ sheet_name: sheetName || "Transactions" })}
            placeholder="Transactions"
          />
        </div>
      </div>

      <p className={`text-sm ${connected ? "text-primary" : "text-muted-foreground"}`}>
        {connected
          ? "Connected — backups go straight to your spreadsheet."
          : "Not connected yet — paste the web app URL above to enable backups."}
      </p>

      <div className="border-t border-border pt-6">
        <Label>Columns written to your sheet</Label>
        <p className="mt-1 mb-3 text-xs text-muted-foreground">
          Created automatically on the first backup, in this exact order.
        </p>
        <div className="flex flex-wrap gap-2">
          {BACKUP_FIELDS.map((field, i) => (
            <span
              key={field.key}
              className="rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
            >
              {i + 1}. {field.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-start justify-between gap-6 border-t border-border pt-6">
        <div>
          <Label htmlFor="auto-backup">Auto backup</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Automatically send every new transaction to your spreadsheet right after it is saved.
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
