/** Server-only helper that posts rows to a Google Form. */
export interface FormSubmitResult {
  sent: number;
  failed: number;
}

export function assertGoogleFormUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Google Form action URL is not a valid URL.");
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "docs.google.com") {
    throw new Error("Action URL must be an https docs.google.com Google Form URL.");
  }
  if (!parsed.pathname.includes("/forms/")) {
    throw new Error("Action URL must point to a Google Form (/forms/.../formResponse).");
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
