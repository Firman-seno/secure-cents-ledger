import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BackupSettings, EntryMap } from "@/lib/backup";

export interface BackupHistoryRow {
  id: string;
  created_at: string;
  row_count: number;
  skipped_count: number;
  range_from: string | null;
  range_to: string | null;
  scope: string;
  status: string;
  duration_ms: number;
  error_message: string | null;
}

const EMPTY: Omit<BackupSettings, "user_id"> = {
  form_url: "",
  form_action_url: "",
  entry_map: {},
  auto_backup: false,
  skip_duplicates: true,
};

export function useBackupSettings() {
  return useQuery({
    queryKey: ["backup-settings"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("backup_settings")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { user_id: auth.user.id, ...EMPTY } as BackupSettings;
      return {
        ...(data as unknown as BackupSettings),
        entry_map: ((data as { entry_map: EntryMap }).entry_map ?? {}) as EntryMap,
      };
    },
  });
}

export function useSaveBackupSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<BackupSettings, "user_id">>) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You must be signed in.");
      const { error } = await supabase
        .from("backup_settings")
        .upsert({ user_id: auth.user.id, ...patch } as never, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backup-settings"] }),
  });
}

export function useBackupHistory() {
  return useQuery({
    queryKey: ["backup-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as BackupHistoryRow[];
    },
  });
}

export function useBackedUpIds() {
  return useQuery({
    queryKey: ["backup-records"],
    queryFn: async () => {
      const { data, error } = await supabase.from("backup_records").select("transaction_id");
      if (error) throw error;
      return new Set((data ?? []).map((r) => (r as { transaction_id: string }).transaction_id));
    },
  });
}
