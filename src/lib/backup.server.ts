/** Server-only helper that posts rows to a Google Form. */
export interface FormSubmitResult {
  sent: number;
  failed: number;
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

  // Accept a pasted /viewform (or edit) link and normalise it to the submit endpoint.
  if (isDocs && !parsed.pathname.endsWith("/formResponse")) {
    parsed.pathname = parsed.pathname
      .replace(/\/(viewform|edit|prefill)\/?$/, "/formResponse")
      .replace(/\/$/, "");
    if (!parsed.pathname.endsWith("/formResponse")) parsed.pathname += "/formResponse";
    parsed.search = "";
  }

  return parsed.toString();
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
        // Google Forms answers 200 on success and 4xx when the form rejects input.
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
