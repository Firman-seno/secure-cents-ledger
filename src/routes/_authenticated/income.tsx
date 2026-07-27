import { createFileRoute } from "@tanstack/react-router";
import { EntryPage } from "@/components/EntryPage";

export const Route = createFileRoute("/_authenticated/income")({
  component: () => (
    <EntryPage
      type="income"
      title="Add income"
      description="Record money coming into one of your accounts."
    />
  ),
});
