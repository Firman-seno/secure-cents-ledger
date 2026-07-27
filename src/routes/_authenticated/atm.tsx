import { createFileRoute } from "@tanstack/react-router";
import { EntryPage } from "@/components/EntryPage";

export const Route = createFileRoute("/_authenticated/atm")({
  component: () => (
    <EntryPage
      type="atm_withdrawal"
      title="ATM withdrawal"
      description="Moves money from your bank to cash. Only the ATM fee counts as a cost — the withdrawal itself is not an expense."
    />
  ),
});
