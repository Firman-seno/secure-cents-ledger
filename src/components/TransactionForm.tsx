import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  balanceForAccount,
  formatMoney,
  todayISO,
  EXPENSE_CATEGORIES,
  INCOME_SOURCES,
  type Account,
  type Transaction,
  type TransactionType,
} from "@/lib/finance";
import { useSaveTransaction, type TransactionInput } from "@/lib/queries";

interface Props {
  type: TransactionType;
  accounts: Account[];
  transactions: Transaction[];
  currency: string;
  allowOverdraft: boolean;
  existing?: Transaction | null;
  onDone?: () => void;
}

export function TransactionForm({
  type,
  accounts,
  transactions,
  currency,
  allowOverdraft,
  existing,
  onDone,
}: Props) {
  const save = useSaveTransaction();
  const [accountId, setAccountId] = useState(existing?.account_id ?? accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(existing?.to_account_id ?? "");
  const [date, setDate] = useState(existing?.transaction_date ?? todayISO());
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [fee, setFee] = useState(existing ? String(existing.fee) : "0");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [paymentMethod, setPaymentMethod] = useState(existing?.payment_method ?? "");
  const [receipt, setReceipt] = useState("");

  const needsDestination = type === "transfer" || type === "atm_withdrawal";
  const sourceAccount = accounts.find((a) => a.id === accountId);
  const destinationAccounts = accounts.filter((a) => a.id !== accountId);
  const sourceBalance = useMemo(
    () =>
      sourceAccount
        ? balanceForAccount(
            sourceAccount,
            transactions.filter((t) => t.id !== existing?.id),
          )
        : 0,
    [sourceAccount, transactions, existing?.id],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = Number(amount);
    const feeNum = Number(fee || 0);

    if (!accountId) return toast.error("Please choose an account.");
    if (!date) return toast.error("Please choose a date.");
    if (!Number.isFinite(amountNum) || amountNum <= 0)
      return toast.error("Amount must be greater than 0.");
    if (!Number.isFinite(feeNum) || feeNum < 0) return toast.error("Fee cannot be negative.");
    if (needsDestination && !toAccountId) return toast.error("Please choose a destination account.");
    if (needsDestination && toAccountId === accountId)
      return toast.error("Source and destination accounts must be different.");
    if (type === "expense" && !category) return toast.error("Please choose a category.");

    if (type !== "income" && !allowOverdraft) {
      const outflow = amountNum + feeNum;
      if (outflow > sourceBalance + 0.0001) {
        return toast.error(
          `Not enough funds in ${sourceAccount?.account_name}. Available: ${formatMoney(sourceBalance, currency)}. Enable overdraft in Settings to allow this.`,
        );
      }
    }

    const payload: TransactionInput = {
      id: existing?.id,
      account_id: accountId,
      to_account_id: needsDestination ? toAccountId : null,
      transaction_type: type,
      amount: amountNum,
      fee: type === "atm_withdrawal" ? feeNum : 0,
      transaction_date: date,
      category: type === "income" ? category || "Other" : type === "expense" ? category : null,
      description: [description, receipt ? `Receipt: ${receipt}` : ""].filter(Boolean).join(" · "),
      payment_method: type === "expense" ? paymentMethod || null : null,
    };

    try {
      await save.mutateAsync(payload);
      toast.success(existing ? "Transaction updated." : "Transaction saved.");
      if (!existing) {
        setAmount("");
        setDescription("");
        setReceipt("");
      }
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the transaction.");
    }
  }

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create an account first — you need somewhere to record this money.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>{needsDestination ? "From account" : "Account"}</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.account_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sourceAccount ? (
            <p className="text-xs text-muted-foreground">
              Balance: {formatMoney(sourceBalance, currency)}
            </p>
          ) : null}
        </div>

        {needsDestination ? (
          <div className="grid gap-2">
            <Label>To account</Label>
            <Select
              value={toAccountId}
              onValueChange={setToAccountId}
              disabled={destinationAccounts.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    destinationAccounts.length === 0
                      ? "No other account yet"
                      : "Choose destination"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {destinationAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {destinationAccounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                You need a second account (for example a “Cash” account) to receive this money.
                Create one on the Accounts page first.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="tx-date">Date</Label>
          <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tx-amount">Amount</Label>
          <Input
            id="tx-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {type === "atm_withdrawal" ? (
          <div className="grid gap-2">
            <Label htmlFor="tx-fee">ATM fee</Label>
            <Input
              id="tx-fee"
              type="number"
              step="0.01"
              min="0"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Charged to the source account.</p>
          </div>
        ) : null}

        {type === "income" ? (
          <div className="grid gap-2">
            <Label>Source</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Choose source" />
              </SelectTrigger>
              <SelectContent>
                {INCOME_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {type === "expense" ? (
          <>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose method" />
                </SelectTrigger>
                <SelectContent>
                  {["Cash", "Debit card", "Credit card", "Transfer", "QRIS", "Other"].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="tx-desc">Description</Label>
        <Textarea
          id="tx-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={500}
        />
      </div>

      {type === "expense" ? (
        <div className="grid gap-2">
          <Label htmlFor="tx-receipt">Receipt image URL (optional)</Label>
          <Input
            id="tx-receipt"
            value={receipt}
            onChange={(e) => setReceipt(e.target.value)}
            placeholder="https://…"
          />
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : existing ? "Save changes" : "Save transaction"}
        </Button>
        {existing ? (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
