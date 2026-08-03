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
  backup_type: string;
  backup_status: string;
  storage_location: string;
  notes: string | null;
}

export interface BackupEventRow {
  id: string;
  entity_type: string;
  operation: string;
  record_id: string;
  created_at: string;
  restored_at: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
}

const EMPTY: Omit<BackupSettings, "user_id"> = {
  form_url: "",
  form_action_url: "",
  entry_map: {},
  spreadsheet_url: "",
  web_app_url: "",
  sheet_name: "Transactions",
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

export function useDeleteBackupHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("backup_history").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backup-history"] }),
  });
}

export function useClearBackupHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You must be signed in.");
      const { error } = await supabase
        .from("backup_history")
        .delete()
        .eq("user_id", auth.user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["backup-history"] }),
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

export function useBackupEvents() {
  return useQuery({
    queryKey: ["backup-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250);
      if (error) throw error;
      return (data ?? []) as unknown as BackupEventRow[];
    },
  });
}

export function useCreateFullBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_full_backup");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backup-history"] });
      qc.invalidateQueries({ queryKey: ["backup-events"] });
    },
  });
}

export function useRestoreBackupEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.rpc("restore_backup_event", { _event_id: eventId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backup-history"] });
      qc.invalidateQueries({ queryKey: ["backup-events"] });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
