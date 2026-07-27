import { createFileRoute } from "@tanstack/react-router";
import { EntryPage } from "@/components/EntryPage";

export const Route = createFileRoute("/_authenticated/expenses")({
  component: () => (
    <EntryPage
      type="expense"
      title="Add expense"
      description="Record a purchase or bill paid from one of your accounts."
    />
  ),
});
