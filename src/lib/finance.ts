export type AccountType = "bank" | "cash" | "ewallet" | "other";
export type TransactionType = "income" | "expense" | "atm_withdrawal" | "transfer";

export interface Account {
  id: string;
  user_id: string;
  account_name: string;
  account_type: AccountType;
  initial_balance: number;
  is_demo: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  to_account_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  fee: number;
  transaction_date: string;
  category: string | null;
  description: string | null;
  payment_method: string | null;
  receipt_url: string | null;
  is_demo: boolean;
  created_at: string;
}

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
  { value: "ewallet", label: "E-Wallet" },
  { value: "other", label: "Other" },
];

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transportation",
  "Shopping",
  "Education",
  "Bills",
  "Health",
  "Entertainment",
  "Household",
  "Donation",
  "Business",
  "Other",
];

export const INCOME_SOURCES = [
  "Salary",
  "Bonus",
  "Freelance",
  "Business",
  "Investment",
  "Gift",
  "Refund",
  "Other",
];

export const TYPE_LABEL: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  atm_withdrawal: "ATM Withdrawal",
  transfer: "Transfer",
};

export function formatMoney(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value || 0);
  } catch {
    return `${currency} ${(value || 0).toFixed(2)}`;
  }
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Signed effect of a transaction on a given account. */
export function effectOnAccount(tx: Transaction, accountId: string): number {
  const amount = Number(tx.amount) || 0;
  const fee = Number(tx.fee) || 0;
  if (tx.account_id === accountId) {
    switch (tx.transaction_type) {
      case "income":
        return amount - fee;
      case "expense":
        return -(amount + fee);
      case "atm_withdrawal":
      case "transfer":
        return -(amount + fee);
    }
  }
  if (tx.to_account_id === accountId) return amount;
  return 0;
}

export function balanceForAccount(
  account: Account,
  transactions: Transaction[],
  upToDate?: string,
) {
  return transactions.reduce(
    (sum, tx) =>
      upToDate && tx.transaction_date > upToDate ? sum : sum + effectOnAccount(tx, account.id),
    Number(account.initial_balance) || 0,
  );
}

export function totalBalance(accounts: Account[], transactions: Transaction[], upToDate?: string) {
  return accounts.reduce((sum, a) => sum + balanceForAccount(a, transactions, upToDate), 0);
}

export interface Totals {
  income: number;
  expense: number;
  withdrawal: number;
  transfer: number;
  fees: number;
  net: number;
}

export function summarize(transactions: Transaction[]): Totals {
  const t: Totals = { income: 0, expense: 0, withdrawal: 0, transfer: 0, fees: 0, net: 0 };
  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    const fee = Number(tx.fee) || 0;
    t.fees += fee;
    if (tx.transaction_type === "income") t.income += amount;
    else if (tx.transaction_type === "expense") t.expense += amount;
    else if (tx.transaction_type === "atm_withdrawal") t.withdrawal += amount;
    else t.transfer += amount;
  }
  // ATM/transfer move money, they are not expenses. Fees are a real cost.
  t.net = t.income - t.expense - t.fees;
  return t;
}

export function inRange(tx: Transaction, from?: string, to?: string) {
  if (from && tx.transaction_date < from) return false;
  if (to && tx.transaction_date > to) return false;
  return true;
}

export function rangePreset(preset: string): { from: string; to: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const to = iso(now);
  switch (preset) {
    case "today":
      return { from: to, to };
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return { from: iso(d), to };
    }
    case "month":
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to };
    case "year":
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to };
    default:
      return { from: "", to: "" };
  }
}

/** Running balance history across all accounts, oldest -> newest. */
export function balanceHistory(accounts: Account[], transactions: Transaction[]) {
  const start = accounts.reduce((s, a) => s + (Number(a.initial_balance) || 0), 0);
  const sorted = [...transactions].sort((a, b) =>
    a.transaction_date.localeCompare(b.transaction_date),
  );
  const byDate = new Map<string, number>();
  let running = start;
  for (const tx of sorted) {
    const delta = accounts.reduce((s, a) => s + effectOnAccount(tx, a.id), 0);
    running += delta;
    byDate.set(tx.transaction_date, running);
  }
  return Array.from(byDate.entries()).map(([date, balance]) => ({ date, balance }));
}
