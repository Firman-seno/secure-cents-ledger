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
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccounts, useProfile, useTransactions } from "@/lib/queries";
import {
  balanceHistory,
  formatMoney,
  inRange,
  rangePreset,
  summarize,
  totalBalance,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom" },
];

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function ReportsPage() {
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const { data: profile } = useProfile();
  const currency = profile?.currency ?? "USD";

  const [preset, setPreset] = useState("month");
  const initial = rangePreset("month");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  function applyPreset(key: string) {
    setPreset(key);
    if (key === "custom") return;
    const r = rangePreset(key);
    setFrom(r.from);
    setTo(r.to);
  }

  const rows = useMemo(
    () => transactions.filter((tx) => inRange(tx, from || undefined, to || undefined)),
    [transactions, from, to],
  );
  const totals = useMemo(() => summarize(rows), [rows]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of rows) {
      if (tx.transaction_type !== "expense") continue;
      const key = tx.category ?? "Other";
      map.set(key, (map.get(key) ?? 0) + Number(tx.amount));
    }
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [rows]);

  const compare = [{ name: "Period", Income: totals.income, Expense: totals.expense }];
  const history = useMemo(() => balanceHistory(accounts, rows), [accounts, rows]);

  const cards = [
    { label: "Total income", value: totals.income },
    { label: "Total expense", value: totals.expense },
    { label: "ATM withdrawals", value: totals.withdrawal },
    { label: "Transfers", value: totals.transfer },
    { label: "Net cash flow", value: totals.net },
    { label: "Current balance", value: totalBalance(accounts, transactions) },
  ];

  return (
    <div>
      <PageHeader title="Reports" description="Analyse any period of your financial history." />

      <div className="surface-card mb-6 p-5">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={preset === p.key ? "default" : "outline"}
              onClick={() => applyPreset(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:max-w-md">
          <div className="grid gap-2">
            <Label htmlFor="r-from">From</Label>
            <Input
              id="r-from"
              type="date"
              value={from}
              onChange={(e) => {
                setPreset("custom");
                setFrom(e.target.value);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="r-to">To</Label>
            <Input
              id="r-to"
              type="date"
              value={to}
              onChange={(e) => {
                setPreset("custom");
                setTo(e.target.value);
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="surface-card p-5">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {formatMoney(c.value, currency)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="font-semibold">Income vs expense</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compare}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                <Legend />
                <Bar dataKey="Income" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-6">
          <h2 className="font-semibold">Expense by category</h2>
          <div className="mt-4 h-64">
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={90} label>
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

        <div className="surface-card p-6 lg:col-span-2">
          <h2 className="font-semibold">Balance over time</h2>
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
      </div>
    </div>
  );
}
