import type { Account, Transaction } from "@/lib/finance";
import { TYPE_LABEL, effectOnAccount } from "@/lib/finance";

export interface ExportRow {
  transaction_id: string;
  date: string;
  type: string;
  account: string;
  destination: string;
  category: string;
  description: string;
  payment_method: string;
  reference_number: string;
  amount: number;
  fee: number;
  balance_after: number;
  status: string;
  created_at: string;
}

export function buildExportRows(transactions: Transaction[], accounts: Account[]): ExportRow[] {
  const nameOf = (id: string | null) => accounts.find((a) => a.id === id)?.account_name ?? "";
  const balances = new Map(accounts.map((a) => [a.id, Number(a.initial_balance) || 0]));
  const rowsById = new Map<string, ExportRow>();
  const ordered = [...transactions].sort(
    (a, b) => a.transaction_date.localeCompare(b.transaction_date) || a.created_at.localeCompare(b.created_at),
  );

  for (const tx of ordered) {
    for (const account of accounts) {
      balances.set(account.id, (balances.get(account.id) ?? 0) + effectOnAccount(tx, account.id));
    }
    rowsById.set(tx.id, {
      transaction_id: tx.id,
      date: tx.transaction_date,
      type: TYPE_LABEL[tx.transaction_type],
      account: nameOf(tx.account_id),
      destination: nameOf(tx.to_account_id),
      category: tx.category ?? "",
      description: tx.description ?? "",
      payment_method: tx.payment_method ?? "",
      reference_number: tx.reference_number ?? "",
      amount: Number(tx.amount),
      fee: Number(tx.fee),
      balance_after: Array.from(balances.values()).reduce((sum, value) => sum + value, 0),
      status: tx.status ?? "completed",
      created_at: tx.created_at,
    });
  }
  return transactions.map((tx) => rowsById.get(tx.id)).filter((row): row is ExportRow => Boolean(row));
}

function download(content: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportRowsCsv(rows: ExportRow[]) {
  const headers = Object.keys(rows[0] ?? {}) as (keyof ExportRow)[];
  const csv = [headers, ...rows.map((row) => headers.map((key) => row[key]))]
    .map((values) => values.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  download(csv, "text/csv;charset=utf-8", `kelola-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportRowsExcel(rows: ExportRow[]) {
  const headers = Object.keys(rows[0] ?? {}) as (keyof ExportRow)[];
  const escape = (value: unknown) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const table = `<table><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${headers.map((key) => `<td>${escape(row[key])}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
  download(`<!doctype html><meta charset="utf-8">${table}`, "application/vnd.ms-excel", `kelola-transactions-${new Date().toISOString().slice(0, 10)}.xls`);
}