import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/AppShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

interface UserStat {
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  account_count: number;
  transaction_count: number;
}

function AdminPage() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-user-stats"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_user_stats");
      if (error) throw error;
      return (data ?? []) as unknown as UserStat[];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div>
      <PageHeader
        title="Admin"
        description="Registered users and their activity. Financial details stay private."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-sm text-muted-foreground">Total users</p>
          <p className="mt-2 text-2xl font-semibold">{users.length}</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-muted-foreground">Total accounts</p>
          <p className="mt-2 text-2xl font-semibold">
            {users.reduce((s, u) => s + Number(u.account_count), 0)}
          </p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-muted-foreground">Total transactions</p>
          <p className="mt-2 text-2xl font-semibold">
            {users.reduce((s, u) => s + Number(u.transaction_count), 0)}
          </p>
        </div>
      </div>

      <div className="surface-card mt-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Accounts</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingUsers ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>{u.email || "—"}</TableCell>
                  <TableCell>{u.created_at.slice(0, 10)}</TableCell>
                  <TableCell className="text-right">{u.account_count}</TableCell>
                  <TableCell className="text-right">{u.transaction_count}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
