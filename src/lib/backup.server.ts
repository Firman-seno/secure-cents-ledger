/** Server-only helpers that push rows to the user's Google destination. */
export interface FormSubmitResult {
  sent: number;
  failed: number;
  error?: string;
}

export function assertGoogleFormUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL((url ?? "").trim());
  } catch {
    throw new Error(
      "Google Form action URL is not a valid URL. Copy it from your form and paste the full https:// link.",
    );
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Google Form action URL must start with https://");
  }

  const host = parsed.hostname.toLowerCase();
  const isDocs = host === "docs.google.com" && parsed.pathname.includes("/forms/");
  const isShortLink = host === "forms.gle" || host === "forms.app.goo.gl";

  if (!isDocs && !isShortLink) {
    throw new Error(
      "Action URL must be a Google Form link, e.g. https://docs.google.com/forms/d/e/XXXX/formResponse",
    );
  }

  if (isDocs && !parsed.pathname.endsWith("/formResponse")) {
    parsed.pathname = parsed.pathname
      .replace(/\/(viewform|edit|prefill)\/?$/, "/formResponse")
      .replace(/\/$/, "");
    if (!parsed.pathname.endsWith("/formResponse")) parsed.pathname += "/formResponse";
    parsed.search = "";
  }

  return parsed.toString();
}

/** Apps Script web app URL: https://script.google.com/macros/s/XXXX/exec */
export function assertWebAppUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL((url ?? "").trim());
  } catch {
    throw new Error("Apps Script URL is not a valid URL. Paste the full https:// link.");
  }
  const host = parsed.hostname.toLowerCase();
  const allowed =
    host === "script.google.com" ||
    host.endsWith(".googleusercontent.com") ||
    host === "script.googleusercontent.com";
  if (parsed.protocol !== "https:" || !allowed) {
    throw new Error(
      "Apps Script URL must look like https://script.google.com/macros/s/XXXX/exec",
    );
  }
  return parsed.toString();
}

export async function postRowsToWebApp(
  webAppUrl: string,
  sheetName: string,
  headers: string[],
  rows: Record<string, string>[],
): Promise<FormSubmitResult> {
  const url = assertWebAppUrl(webAppUrl);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ sheet: sheetName || "Transactions", headers, rows }),
      redirect: "follow",
    });
    const text = await res.text();
    if (!res.ok) {
      return { sent: 0, failed: rows.length, error: `Apps Script replied ${res.status}: ${text.slice(0, 200)}` };
    }
    let payload: { ok?: boolean; inserted?: number; error?: string } = {};
    try {
      payload = JSON.parse(text) as typeof payload;
    } catch {
      // Apps Script may return HTML when the deployment is not public.
      return {
        sent: 0,
        failed: rows.length,
        error:
          "Apps Script did not return JSON. Re-deploy the script with access set to \"Anyone\".",
      };
    }
    if (payload.ok === false) {
      return { sent: 0, failed: rows.length, error: payload.error ?? "Apps Script rejected the rows." };
    }
    const inserted = typeof payload.inserted === "number" ? payload.inserted : rows.length;
    return { sent: inserted, failed: rows.length - inserted };
  } catch (err) {
    return {
      sent: 0,
      failed: rows.length,
      error: err instanceof Error ? err.message : "Could not reach the Apps Script web app.",
    };
  }
}

export async function postRowsToForm(
  actionUrl: string,
  rows: Record<string, string>[],
): Promise<FormSubmitResult> {
  const url = assertGoogleFormUrl(actionUrl);
  let sent = 0;
  let failed = 0;

  const results = await Promise.all(
    rows.map(async (row) => {
      const body = new URLSearchParams();
      for (const [entryId, value] of Object.entries(row)) {
        if (entryId.startsWith("entry.")) body.append(entryId, value ?? "");
      }
      if ([...body.keys()].length === 0) return false;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });
        return res.ok;
      } catch {
        return false;
      }
    }),
  );

  for (const ok of results) {
    if (ok) sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}
