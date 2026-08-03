-- Remove the backup feature entirely: tables, functions, triggers, and policies.

DROP TRIGGER IF EXISTS accounts_backup_event ON public.accounts;
DROP TRIGGER IF EXISTS transactions_backup_event ON public.transactions;
DROP TRIGGER IF EXISTS profiles_backup_event ON public.profiles;
DROP TRIGGER IF EXISTS backup_settings_backup_event ON public.backup_settings;

DROP FUNCTION IF EXISTS public.capture_backup_event();
DROP FUNCTION IF EXISTS public.create_full_backup();
DROP FUNCTION IF EXISTS public.restore_backup_event(uuid);

DROP TABLE IF EXISTS public.backup_events;
DROP TABLE IF EXISTS public.backup_history;
DROP TABLE IF EXISTS public.backup_records;
DROP TABLE IF EXISTS public.backup_settings;
