CREATE TABLE public.backup_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  form_url text NOT NULL DEFAULT '',
  form_action_url text NOT NULL DEFAULT '',
  entry_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_backup boolean NOT NULL DEFAULT false,
  skip_duplicates boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backup_settings TO authenticated;
GRANT ALL ON public.backup_settings TO service_role;
ALTER TABLE public.backup_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own backup settings" ON public.backup_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.backup_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  row_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  range_from date,
  range_to date,
  scope text NOT NULL DEFAULT 'all',
  status text NOT NULL DEFAULT 'success',
  duration_ms integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backup_history TO authenticated;
GRANT ALL ON public.backup_history TO service_role;
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own backup history" ON public.backup_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX backup_history_user_idx ON public.backup_history (user_id, created_at DESC);

CREATE TABLE public.backup_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, transaction_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backup_records TO authenticated;
GRANT ALL ON public.backup_records TO service_role;
ALTER TABLE public.backup_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own backup records" ON public.backup_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER backup_settings_updated_at BEFORE UPDATE ON public.backup_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();