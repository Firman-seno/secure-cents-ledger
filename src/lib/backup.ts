import type { Account, Transaction } from "@/lib/finance";
import { TYPE_LABEL, effectOnAccount } from "@/lib/finance";

export const BACKUP_FIELDS = [
  { key: "transaction_id", label: "Transaction ID" },
  { key: "date", label: "Date" },
  { key: "day", label: "Day" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "transaction_type", label: "Transaction Type" },
  { key: "category", label: "Category" },
  { key: "account", label: "Account" },
  { key: "income", label: "Income" },
  { key: "expense", label: "Expense" },
  { key: "balance", label: "Balance After Transaction" },
  { key: "payment_method", label: "Payment Method" },
  { key: "description", label: "Description" },
  { key: "notes", label: "Notes" },
  { key: "created_by", label: "Created By" },
  { key: "created_at", label: "Created At" },
] as const;

export type BackupFieldKey = (typeof BACKUP_FIELDS)[number]["key"];
export type EntryMap = Partial<Record<BackupFieldKey, string>>;

export interface BackupSettings {
  user_id: string;
  form_url: string;
  form_action_url: string;
  entry_map: EntryMap;
  spreadsheet_url: string;
  web_app_url: string;
  sheet_name: string;
  auto_backup: boolean;
  skip_duplicates: boolean;
}

/** Column headers written to the user's spreadsheet, in order. */
export const SHEET_HEADERS = BACKUP_FIELDS.map((f) => f.label);

/** Turn a mapped row into the spreadsheet column order (labels as keys). */
export function rowToSheetRecord(row: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const field of BACKUP_FIELDS) out[field.label] = row[field.key] ?? "";
  return out;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Rows in spreadsheet column order, with running balance across all accounts. */
export function buildBackupRows(
  transactions: Transaction[],
  allTransactions: Transaction[],
  accounts: Account[],
  createdBy: string,
): Record<BackupFieldKey, string>[] {
  const start = accounts.reduce((s, a) => s + (Number(a.initial_balance) || 0), 0);
  const sorted = [...allTransactions].sort(
    (a, b) =>
      a.transaction_date.localeCompare(b.transaction_date) ||
      a.created_at.localeCompare(b.created_at),
  );
  const balanceById = new Map<string, number>();
  let running = start;
  for (const tx of sorted) {
    running += accounts.reduce((s, a) => s + effectOnAccount(tx, a.id), 0);
    balanceById.set(tx.id, running);
  }
  const nameOf = (id: string | null) => accounts.find((a) => a.id === id)?.account_name ?? "";

  return transactions.map((tx) => {
    const d = new Date(`${tx.transaction_date}T00:00:00`);
    const account =
      tx.to_account_id && tx.transaction_type !== "expense" && tx.transaction_type !== "income"
        ? `${nameOf(tx.account_id)} → ${nameOf(tx.to_account_id)}`
        : nameOf(tx.account_id);
    return {
      transaction_id: tx.id,
      date: tx.transaction_date,
      day: String(d.getDate()),
      month: MONTHS[d.getMonth()] ?? "",
      year: String(d.getFullYear()),
      transaction_type: TYPE_LABEL[tx.transaction_type],
      category: tx.category ?? "",
      account,
      income: tx.transaction_type === "income" ? String(tx.amount) : "0",
      expense: tx.transaction_type === "expense" ? String(tx.amount) : "0",
      balance: String(balanceById.get(tx.id) ?? ""),
      payment_method: tx.payment_method ?? "",
      description: tx.description ?? "",
      notes: Number(tx.fee) ? `Fee: ${tx.fee}` : "",
      created_by: createdBy,
      created_at: tx.created_at,
    };
  });
}

export function monthOptions(transactions: Transaction[]) {
  const set = new Set(transactions.map((t) => t.transaction_date.slice(0, 7)));
  return Array.from(set)
    .sort((a, b) => b.localeCompare(a))
    .map((value) => {
      const [y, m] = value.split("-");
      return { value, label: `${MONTHS[Number(m) - 1]} ${y}` };
    });
}

export function monthRange(value: string) {
  const [y, m] = value.split("-").map(Number);
  const from = `${value}-01`;
  const last = new Date(y!, m!, 0).getDate();
  return { from, to: `${value}-${String(last).padStart(2, "0")}` };
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}
