import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const submitBackupChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { actionUrl: string; rows: Record<string, string>[] }) => {
    if (!input?.actionUrl) throw new Error("Google Form action URL is missing.");
    if (!Array.isArray(input.rows) || input.rows.length === 0)
      throw new Error("No rows to back up.");
    if (input.rows.length > 100) throw new Error("Too many rows in one request.");
    return input;
  })
  .handler(async ({ data }) => {
    const { postRowsToForm } = await import("@/lib/backup.server");
    return postRowsToForm(data.actionUrl, data.rows);
  });

export const submitSheetChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      webAppUrl: string;
      sheetName: string;
      spreadsheetUrl?: string;
      headers: string[];
      rows: Record<string, string>[];
    }) => {
      if (!input?.webAppUrl) throw new Error("Apps Script web app URL is missing.");
      if (!Array.isArray(input.rows) || input.rows.length === 0)
        throw new Error("No rows to back up.");
      if (input.rows.length > 200) throw new Error("Too many rows in one request.");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { postRowsToWebApp } = await import("@/lib/backup.server");
    return postRowsToWebApp(
      data.webAppUrl,
      data.sheetName,
      data.headers,
      data.rows,
      data.spreadsheetUrl,
    );
  });

export const testSheetConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { webAppUrl: string; sheetName: string; spreadsheetUrl?: string }) => {
    if (!input?.webAppUrl) throw new Error("Paste your Apps Script web app URL first.");
    return input;
  })
  .handler(async ({ data }) => {
    const { postRowsToWebApp } = await import("@/lib/backup.server");
    const headers = ["Transaction ID", "Note"];
    return postRowsToWebApp(
      data.webAppUrl,
      data.sheetName || "Transactions",
      headers,
      [{ "Transaction ID": "TEST", Note: `Connection test ${new Date().toISOString()}` }],
      data.spreadsheetUrl,
    );
  });
