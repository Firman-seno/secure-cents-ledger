import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Account, Transaction } from "@/lib/finance";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        full_name: string;
        email: string;
        currency: string;
        allow_overdraft: boolean;
        created_at: string;
      } | null;
    },
  });
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Account[];
    },
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Transaction[];
    },
  });
}

export function useInvalidateFinance() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
  };
}

export function useSaveAccount() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: async (input: Partial<Account> & { id?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You must be signed in.");
      if (input.id) {
        const { error } = await supabase
          .from("accounts")
          .update({
            account_name: input.account_name,
            account_type: input.account_type,
            initial_balance: input.initial_balance,
          } as never)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("accounts").insert({
        user_id: auth.user.id,
        account_name: input.account_name,
        account_type: input.account_type,
        initial_balance: input.initial_balance ?? 0,
      } as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteAccount() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export type TransactionInput = {
  id?: string;
  account_id: string;
  to_account_id?: string | null;
  transaction_type: Transaction["transaction_type"];
  amount: number;
  fee?: number;
  transaction_date: string;
  category?: string | null;
  description?: string | null;
  payment_method?: string | null;
};

export function useSaveTransaction() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You must be signed in.");
      const payload = {
        account_id: input.account_id,
        to_account_id: input.to_account_id || null,
        transaction_type: input.transaction_type,
        amount: input.amount,
        fee: input.fee ?? 0,
        transaction_date: input.transaction_date,
        category: input.category || null,
        description: input.description || null,
        payment_method: input.payment_method || null,
      };
      if (input.id) {
        const { error } = await supabase
          .from("transactions")
          .update(payload as never)
          .eq("id", input.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("transactions")
        .insert({ ...payload, user_id: auth.user.id } as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { full_name?: string; currency?: string; allow_overdraft?: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You must be signed in.");
      const { error } = await supabase
        .from("profiles")
        .update(input as never)
        .eq("id", auth.user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}
