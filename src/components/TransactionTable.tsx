import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  effectOnAccount,
  formatMoney,
  TYPE_LABEL,
  type Account,
  type Transaction,
} from "@/lib/finance";
import { useDeleteTransaction } from "@/lib/queries";
import { TransactionForm } from "@/components/TransactionForm";

interface Props {
  transactions: Transaction[];
  allTransactions: Transaction[];
  accounts: Account[];
  currency: string;
  allowOverdraft: boolean;
  showRunningBalance?: boolean;
}

export function TransactionTable({
  transactions,
  allTransactions,
  accounts,
  currency,
  allowOverdraft,
  showRunningBalance = false,
}: Props) {
  const del = useDeleteTransaction();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const nameOf = (id: string | null) =>
    accounts.find((a) => a.id === id)?.account_name ?? "—";

  // running balance across all accounts, oldest first
  const ordered = [...allTransactions].sort(
    (a, b) =>
      a.transaction_date.localeCompare(b.transaction_date) ||
      a.created_at.localeCompare(b.created_at),
  );
  const startBalance = accounts.reduce((s, a) => s + Number(a.initial_balance || 0), 0);
  const balanceAfter = new Map<string, number>();
  let running = startBalance;
  for (const tx of ordered) {
    running += accounts.reduce((s, a) => s + effectOnAccount(tx, a.id), 0);
    balanceAfter.set(tx.id, running);
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this transaction? This cannot be undone.")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Transaction deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete.");
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="surface-card p-8 text-center text-sm text-muted-foreground">
        No transactions yet.
      </div>
    );
  }

  return (
    <>
      <div className="surface-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Income</TableHead>
              <TableHead className="text-right">Expense</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {showRunningBalance ? <TableHead className="text-right">Balance after</TableHead> : null}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const amount = Number(tx.amount);
              const isIncome = tx.transaction_type === "income";
              const isExpense = tx.transaction_type === "expense";
              return (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap">{tx.transaction_date}</TableCell>
                  <TableCell>
                    <Badge variant={isIncome ? "default" : isExpense ? "destructive" : "secondary"}>
                      {TYPE_LABEL[tx.transaction_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {nameOf(tx.account_id)}
                    {tx.to_account_id ? ` → ${nameOf(tx.to_account_id)}` : ""}
                  </TableCell>
                  <TableCell>{tx.category ?? "—"}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{tx.description ?? "—"}</TableCell>
                  <TableCell className="text-right text-success">
                    {isIncome ? formatMoney(amount, currency) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {isExpense ? formatMoney(amount, currency) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    {formatMoney(amount, currency)}
                    {Number(tx.fee) > 0 ? (
                      <span className="block text-xs text-muted-foreground">
                        fee {formatMoney(Number(tx.fee), currency)}
                      </span>
                    ) : null}
                  </TableCell>
                  {showRunningBalance ? (
                    <TableCell className="text-right whitespace-nowrap">
                      {formatMoney(balanceAfter.get(tx.id) ?? 0, currency)}
                    </TableCell>
                  ) : null}
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(tx)} aria-label="Edit">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(tx.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
          </DialogHeader>
          {editing ? (
            <TransactionForm
              type={editing.transaction_type}
              accounts={accounts}
              transactions={allTransactions}
              currency={currency}
              allowOverdraft={allowOverdraft}
              existing={editing}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
