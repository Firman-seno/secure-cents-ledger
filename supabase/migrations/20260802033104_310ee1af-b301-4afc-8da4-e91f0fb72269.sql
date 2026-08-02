ALTER TABLE public.backup_settings
  ADD COLUMN IF NOT EXISTS spreadsheet_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS web_app_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sheet_name text NOT NULL DEFAULT 'Transactions';