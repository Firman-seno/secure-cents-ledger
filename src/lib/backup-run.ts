import { supabase } from "@/integrations/supabase/client";
import { submitBackupChunk } from "@/lib/backup.functions";
import { buildBackupRows, type BackupSettings, type EntryMap } from "@/lib/backup";
import type { Account, Transaction } from "@/lib/finance";

const CHUNK = 10;

export function mapRowToEntries(
  row: Record<string, string>,
  entryMap: EntryMap,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, entryId] of Object.entries(entryMap)) {
    const id = (entryId ?? "").trim();
    if (!id) continue;
    out[id.startsWith("entry.") ? id : `entry.${id}`] = row[field] ?? "";
  }
  return out;
}

export interface RunBackupInput {
  settings: BackupSettings;
  transactions: Transaction[];
  allTransactions: Transaction[];
  accounts: Account[];
  createdBy: string;
  skipIds?: Set<string>;
  scope?: string;
  from?: string | null;
  to?: string | null;
  onProgress?: (percent: number) => void;
}

export interface RunBackupResult {
  sent: number;
  skipped: number;
  failed: number;
}

export async function runBackup({
  settings,
  transactions,
  allTransactions,
  accounts,
  createdBy,
  skipIds,
  scope = "all",
  from = null,
  to = null,
  onProgress,
}: RunBackupInput): Promise<RunBackupResult> {
  if (!settings.form_action_url) throw new Error("Google Form action URL is not configured yet.");
  if (Object.values(settings.entry_map ?? {}).filter(Boolean).length === 0)
    throw new Error("No Google Form entry IDs configured yet.");

  const started = Date.now();
  const pending = skipIds ? transactions.filter((t) => !skipIds.has(t.id)) : transactions;
  const skipped = transactions.length - pending.length;

  if (pending.length === 0) {
    onProgress?.(100);
    return { sent: 0, skipped, failed: 0 };
  }

  const rows = buildBackupRows(pending, allTransactions, accounts, createdBy);
  let sent = 0;
  let failed = 0;
  const sentIds: string[] = [];

  try {
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const result = await submitBackupChunk({
        data: {
          actionUrl: settings.form_action_url,
          rows: slice.map((r) => mapRowToEntries(r, settings.entry_map ?? {})),
        },
      });
      sent += result.sent;
      failed += result.failed;
      if (result.sent > 0) sentIds.push(...slice.slice(0, result.sent).map((r) => r.transaction_id));
      onProgress?.(Math.round(Math.min(i + CHUNK, rows.length) * (100 / rows.length)));
    }
  } catch (err) {
    await writeHistory({
      scope,
      from,
      to,
      sent,
      skipped,
      status: "failed",
      duration: Date.now() - started,
      error: err instanceof Error ? err.message : "Backup failed.",
    });
    throw err;
  }

  if (sentIds.length) {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      await supabase.from("backup_records").upsert(
        sentIds.map((id) => ({ user_id: auth.user!.id, transaction_id: id })) as never,
        { onConflict: "user_id,transaction_id" },
      );
    }
  }

  await writeHistory({
    scope,
    from,
    to,
    sent,
    skipped,
    status: failed > 0 ? "failed" : "success",
    duration: Date.now() - started,
    error: failed > 0 ? `${failed} row(s) were rejected by Google Forms.` : null,
  });

  return { sent, skipped, failed };
}

async function writeHistory(input: {
  scope: string;
  from: string | null;
  to: string | null;
  sent: number;
  skipped: number;
  status: string;
  duration: number;
  error: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("backup_history").insert({
    user_id: auth.user.id,
    scope: input.scope,
    range_from: input.from,
    range_to: input.to,
    row_count: input.sent,
    skipped_count: input.skipped,
    status: input.status,
    duration_ms: input.duration,
    error_message: input.error,
  } as never);
}
