import { createFileRoute } from "@tanstack/react-router";
import { EntryPage } from "@/components/EntryPage";

export const Route = createFileRoute("/_authenticated/transfers")({
  component: () => (
    <EntryPage
      type="transfer"
      title="Transfer between accounts"
      description="Move money between your own accounts. Transfers are neither income nor expense."
    />
  ),
});
