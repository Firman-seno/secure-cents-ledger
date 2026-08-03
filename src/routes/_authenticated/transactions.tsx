import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionTable } from "@/components/TransactionTable";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { buildExportRows, exportRowsCsv, exportRowsExcel } from "@/lib/data-export";

import { useAccounts, useProfile, useTransactions } from "@/lib/queries";
import { EXPENSE_CATEGORIES, INCOME_SOURCES, TYPE_LABEL, inRange } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TransactionsPage,
});

const ALL = "__all__";

function TransactionsPage() {
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const { data: profile } = useProfile();
  const currency = profile?.currency ?? "USD";

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [account, setAccount] = useState(ALL);
  const [sort, setSort] = useState("newest");

  const categories = Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_SOURCES])).sort();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = transactions.filter((tx) => {
      if (!inRange(tx, from || undefined, to || undefined)) return false;
      if (type !== ALL && tx.transaction_type !== type) return false;
      if (category !== ALL && tx.category !== category) return false;
      if (account !== ALL && tx.account_id !== account && tx.to_account_id !== account) return false;
      if (q) {
        const hay = `${tx.description ?? ""} ${tx.category ?? ""} ${tx.payment_method ?? ""}`.toLowerCase();
        if (!hay.includes(q) && !String(tx.amount).includes(q)) return false;
      }
      return true;
    });
    rows.sort((a, b) =>
      sort === "newest"
        ? b.transaction_date.localeCompare(a.transaction_date) ||
          b.created_at.localeCompare(a.created_at)
        : a.transaction_date.localeCompare(b.transaction_date) ||
          a.created_at.localeCompare(b.created_at),
    );
    return rows;
  }, [transactions, search, from, to, type, category, account, sort]);

  return (
    <div>
      <PageHeader
        title="Transaction history"
        description={`${filtered.length} of ${transactions.length} transactions`}
        action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => exportRowsCsv(buildExportRows(filtered, accounts))} disabled={!filtered.length}><Download className="size-4" /> CSV</Button><Button variant="outline" onClick={() => exportRowsExcel(buildExportRows(filtered, accounts))} disabled={!filtered.length}><FileSpreadsheet className="size-4" /> Excel</Button><Button variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Print</Button></div>}
      />


      <div className="surface-card mb-6 grid gap-4 p-5 md:grid-cols-3 xl:grid-cols-4">
        <div className="grid gap-2">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Description, category, amount…"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="from">From date</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="to">To date</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {Object.entries(TYPE_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Account</Label>
          <Select value={account} onValueChange={setAccount}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.account_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Sort</Label>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <TransactionTable
        transactions={filtered}
        allTransactions={transactions}
        accounts={accounts}
        currency={currency}
        allowOverdraft={profile?.allow_overdraft ?? false}
        showRunningBalance
      />
    </div>
  );
}
