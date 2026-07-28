import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Wallet, Banknote, PieChart, ArrowLeftRight, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kelola — Personal Finance Tracker for Every Wallet" },
      {
        name: "description",
        content:
          "Track income, expenses, ATM withdrawals and transfers across bank, cash and e-wallet accounts. Private, secure and always in sync.",
      },
      { property: "og:title", content: "Kelola — Personal Finance Tracker" },
      {
        property: "og:description",
        content:
          "Track income, expenses, ATM withdrawals and transfers across bank, cash and e-wallet accounts.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Wallet,
    title: "Multiple accounts",
    body: "Bank, cash, e-wallet and more — each with its own live balance.",
  },
  {
    icon: Banknote,
    title: "ATM withdrawals done right",
    body: "Money moves from bank to cash. Only the fee counts as a cost.",
  },
  {
    icon: ArrowLeftRight,
    title: "Transfers",
    body: "Move money between your own accounts without skewing income or expense.",
  },
  {
    icon: LineChart,
    title: "Balance on any date",
    body: "Rewind to any day and see exactly what each account held.",
  },
  {
    icon: PieChart,
    title: "Reports",
    body: "Income vs expense, category breakdown and balance over time.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    body: "Row-level security means your data is only ever visible to you.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="brand-gradient flex size-9 items-center justify-center rounded-lg text-primary-foreground">
            <Wallet className="size-5" />
          </span>
          <span className="text-xl font-semibold tracking-tight">Kelola</span>
        </div>
        <Button asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <p className="text-sm font-medium text-primary">Personal finance, properly tracked</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            Every rupiah, dollar and coin — accounted for.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Kelola keeps your bank, cash and e-wallet balances honest. Log income, expenses, ATM
            withdrawals and transfers, then see the whole picture on one private dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Create free account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-4 px-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="surface-card p-6">
                <f.icon className="size-5 text-primary" />
                <h2 className="mt-4 font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
        Kelola — your money, your data.
      </footer>
    </div>
  );
}
