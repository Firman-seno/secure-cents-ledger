import type { TransactionType } from "@/lib/finance";
import { PageHeader } from "@/components/AppShell";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionTable } from "@/components/TransactionTable";
import { useAccounts, useProfile, useTransactions } from "@/lib/queries";

export function EntryPage({
  type,
  title,
  description,
}: {
  type: TransactionType;
  title: string;
  description: string;
}) {
  const { data: accounts = [], isLoading: la } = useAccounts();
  const { data: transactions = [], isLoading: lt } = useTransactions();
  const { data: profile } = useProfile();
  const currency = profile?.currency ?? "USD";

  const recent = transactions.filter((t) => t.transaction_type === type).slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={title} description={description} />
      <div className="surface-card p-6">
        {la || lt ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <TransactionForm
            type={type}
            accounts={accounts}
            transactions={transactions}
            currency={currency}
            allowOverdraft={profile?.allow_overdraft ?? false}
          />
        )}
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold tracking-tight">Recent</h2>
      <TransactionTable
        transactions={recent}
        accounts={accounts}
        currency={currency}
        allowOverdraft={profile?.allow_overdraft ?? false}
        allTransactions={transactions}
      />
    </div>
  );
}
