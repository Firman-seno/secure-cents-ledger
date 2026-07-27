import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Wallet, TrendingUp, TrendingDown, Banknote, Layers } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAccounts, useProfile, useTransactions } from "@/lib/queries";
import {
  balanceForAccount,
  balanceHistory,
  formatMoney,
  summarize,
  todayISO,
  totalBalance,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function Dashboard() {
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const { data: profile } = useProfile();
  const currency = profile?.currency ?? "USD";

  const [asOf, setAsOf] = useState(todayISO());
  const [appliedDate, setAppliedDate] = useState<string | undefined>(undefined);

  const totals = useMemo(() => summarize(transactions), [transactions]);
  const balance = totalBalance(accounts, transactions);

  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expense: number }>();
    for (const tx of transactions) {
      const month = tx.transaction_date.slice(0, 7);
      const row = map.get(month) ?? { month, income: 0, expense: 0 };
      if (tx.transaction_type === "income") row.income += Number(tx.amount);
      if (tx.transaction_type === "expense") row.expense += Number(tx.amount);
      map.set(month, row);
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }, [transactions]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.transaction_type !== "expense") continue;
      const key = tx.category ?? "Other";
      map.set(key, (map.get(key) ?? 0) + Number(tx.amount));
    }
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const history = useMemo(() => balanceHistory(accounts, transactions), [accounts, transactions]);

  const stats = [
    { label: "Total balance", value: balance, icon: Wallet },
    { label: "Total income", value: totals.income, icon: TrendingUp },
    { label: "Total expense", value: totals.expense, icon: TrendingDown },
    { label: "ATM withdrawals", value: totals.withdrawal, icon: Banknote },
  ];

  return (
    <div>
      <PageHeader
        title={`Hello, ${profile?.full_name?.split(" ")[0] || "there"}`}
        description="Everything below is calculated from your own transactions."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="surface-card p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <s.icon className="size-4" /> {s.label}
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {formatMoney(s.value, currency)}
            </p>
          </div>
        ))}
        <div className="surface-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="size-4" /> Total accounts
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{accounts.length}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="surface-card p-6">
          <h2 className="font-semibold">Balance by account</h2>
          <ul className="mt-4 grid gap-3">
            {accounts.length === 0 ? (
              <li className="text-sm text-muted-foreground">No accounts yet.</li>
            ) : (
              accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{a.account_name}</span>
                  <span className="font-medium">
                    {formatMoney(balanceForAccount(a, transactions), currency)}
                  </span>
                </li>
              ))
            )}
          </ul>

          <div className="mt-6 border-t border-border pt-5">
            <Label htmlFor="asof" className="text-sm">
              Balance on a specific date
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="asof"
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
              />
              <Button variant="outline" onClick={() => setAppliedDate(asOf)}>
                View
              </Button>
            </div>
            {appliedDate ? (
              <ul className="mt-4 grid gap-2 text-sm">
                {accounts.map((a) => (
                  <li key={a.id} className="flex justify-between">
                    <span className="text-muted-foreground">{a.account_name}</span>
                    <span>{formatMoney(balanceForAccount(a, transactions, appliedDate), currency)}</span>
                  </li>
                ))}
                <li className="flex justify-between border-t border-border pt-2 font-semibold">
                  <span>Total on {appliedDate}</span>
                  <span>{formatMoney(totalBalance(accounts, transactions, appliedDate), currency)}</span>
                </li>
              </ul>
            ) : null}
          </div>
        </div>

        <div className="surface-card p-6 lg:col-span-2">
          <h2 className="font-semibold">Income vs expense</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                <Legend />
                <Bar dataKey="income" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-6 lg:col-span-2">
          <h2 className="font-semibold">Balance history</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-6">
          <h2 className="font-semibold">Expense by category</h2>
          <div className="mt-4 h-64">
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={90}>
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
