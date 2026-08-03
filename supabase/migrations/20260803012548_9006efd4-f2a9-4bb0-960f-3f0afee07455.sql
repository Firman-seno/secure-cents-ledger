ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS opening_balance numeric,
  ADD COLUMN IF NOT EXISTS current_balance numeric,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

UPDATE public.accounts
SET opening_balance = initial_balance
WHERE opening_balance IS NULL;

ALTER TABLE public.accounts
  ALTER COLUMN opening_balance SET DEFAULT 0,
  ALTER COLUMN opening_balance SET NOT NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS balance_after numeric,
  ADD COLUMN IF NOT EXISTS attachment text;

UPDATE public.transactions
SET attachment = receipt_url
WHERE attachment IS NULL AND receipt_url IS NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS profile_photo text;

ALTER TABLE public.backup_history
  ADD COLUMN IF NOT EXISTS backup_type text NOT NULL DEFAULT 'automatic',
  ADD COLUMN IF NOT EXISTS backup_status text NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS storage_location text NOT NULL DEFAULT 'Kelola Cloud Database',
  ADD COLUMN IF NOT EXISTS notes text;

CREATE TABLE public.backup_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('accounts','transactions','profiles','backup_settings')),
  record_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE','SNAPSHOT')),
  before_data jsonb,
  after_data jsonb,
  backup_batch_id uuid REFERENCES public.backup_history(id) ON DELETE SET NULL,
  restored_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.backup_events TO authenticated;
GRANT ALL ON public.backup_events TO service_role;
ALTER TABLE public.backup_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backup_events_select_own"
  ON public.backup_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "backup_events_mark_restored_own"
  ON public.backup_events FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX backup_events_user_created_idx
  ON public.backup_events(user_id, created_at DESC);
CREATE INDEX backup_events_record_idx
  ON public.backup_events(user_id, entity_type, record_id, created_at DESC);
CREATE UNIQUE INDEX backup_events_snapshot_unique_idx
  ON public.backup_events(backup_batch_id, entity_type, record_id)
  WHERE backup_batch_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.capture_backup_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_data jsonb;
  owner_id uuid;
  row_id uuid;
BEGIN
  IF current_setting('app.restore_mode', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  owner_id := CASE WHEN TG_TABLE_NAME = 'profiles'
    THEN (row_data->>'id')::uuid
    ELSE (row_data->>'user_id')::uuid
  END;
  row_id := CASE WHEN TG_TABLE_NAME = 'backup_settings'
    THEN owner_id
    ELSE (row_data->>'id')::uuid
  END;

  INSERT INTO public.backup_events (
    user_id, entity_type, record_id, operation, before_data, after_data
  ) VALUES (
    owner_id,
    TG_TABLE_NAME,
    row_id,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  INSERT INTO public.backup_history (
    user_id, row_count, skipped_count, scope, status, duration_ms,
    backup_type, backup_status, storage_location, notes
  ) VALUES (
    owner_id, 1, 0, lower(TG_TABLE_NAME), 'success', 0,
    'automatic', 'success', 'Kelola Cloud Database',
    TG_OP || ' ' || TG_TABLE_NAME
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.capture_backup_event() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_backup_event() TO service_role;

CREATE TRIGGER accounts_backup_event
AFTER INSERT OR UPDATE OR DELETE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.capture_backup_event();
CREATE TRIGGER transactions_backup_event
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.capture_backup_event();
CREATE TRIGGER profiles_backup_event
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.capture_backup_event();
CREATE TRIGGER backup_settings_backup_event
AFTER INSERT OR UPDATE OR DELETE ON public.backup_settings
FOR EACH ROW EXECUTE FUNCTION public.capture_backup_event();

CREATE OR REPLACE FUNCTION public.create_full_backup()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  batch_id uuid;
  total_rows integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT
    (SELECT count(*) FROM public.accounts WHERE user_id = uid) +
    (SELECT count(*) FROM public.transactions WHERE user_id = uid) +
    (SELECT count(*) FROM public.profiles WHERE id = uid) +
    (SELECT count(*) FROM public.backup_settings WHERE user_id = uid)
  INTO total_rows;

  INSERT INTO public.backup_history (
    user_id, row_count, skipped_count, scope, status, duration_ms,
    backup_type, backup_status, storage_location, notes
  ) VALUES (
    uid, total_rows, 0, 'all', 'success', 0,
    'manual_snapshot', 'success', 'Kelola Cloud Database',
    'Full relational database snapshot'
  ) RETURNING id INTO batch_id;

  INSERT INTO public.backup_events(user_id, entity_type, record_id, operation, after_data, backup_batch_id)
    SELECT uid, 'accounts', id, 'SNAPSHOT', to_jsonb(a), batch_id
    FROM public.accounts a WHERE user_id = uid;
  INSERT INTO public.backup_events(user_id, entity_type, record_id, operation, after_data, backup_batch_id)
    SELECT uid, 'transactions', id, 'SNAPSHOT', to_jsonb(t), batch_id
    FROM public.transactions t WHERE user_id = uid;
  INSERT INTO public.backup_events(user_id, entity_type, record_id, operation, after_data, backup_batch_id)
    SELECT uid, 'profiles', id, 'SNAPSHOT', to_jsonb(p), batch_id
    FROM public.profiles p WHERE id = uid;
  INSERT INTO public.backup_events(user_id, entity_type, record_id, operation, after_data, backup_batch_id)
    SELECT uid, 'backup_settings', user_id, 'SNAPSHOT', to_jsonb(s), batch_id
    FROM public.backup_settings s WHERE user_id = uid;

  RETURN batch_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_full_backup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_full_backup() TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_backup_event(_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  e public.backup_events%ROWTYPE;
  restore_data jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO e FROM public.backup_events WHERE id = _event_id AND user_id = uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Backup version not found'; END IF;

  PERFORM set_config('app.restore_mode', 'on', true);
  restore_data := CASE
    WHEN e.operation IN ('UPDATE','DELETE') THEN e.before_data
    ELSE e.after_data
  END;

  IF e.operation = 'INSERT' THEN
    IF e.entity_type = 'transactions' THEN DELETE FROM public.transactions WHERE id=e.record_id AND user_id=uid;
    ELSIF e.entity_type = 'accounts' THEN DELETE FROM public.accounts WHERE id=e.record_id AND user_id=uid;
    ELSIF e.entity_type = 'profiles' THEN RAISE EXCEPTION 'The original profile cannot be removed';
    ELSIF e.entity_type = 'backup_settings' THEN DELETE FROM public.backup_settings WHERE user_id=uid;
    END IF;
  ELSIF e.entity_type = 'accounts' THEN
    INSERT INTO public.accounts SELECT (jsonb_populate_record(NULL::public.accounts, restore_data)).*
    ON CONFLICT (id) DO UPDATE SET
      account_name=EXCLUDED.account_name, account_type=EXCLUDED.account_type,
      initial_balance=EXCLUDED.initial_balance, is_demo=EXCLUDED.is_demo,
      updated_at=EXCLUDED.updated_at, account_number=EXCLUDED.account_number,
      bank_name=EXCLUDED.bank_name, currency=EXCLUDED.currency,
      opening_balance=EXCLUDED.opening_balance, current_balance=EXCLUDED.current_balance,
      status=EXCLUDED.status;
  ELSIF e.entity_type = 'transactions' THEN
    INSERT INTO public.transactions SELECT (jsonb_populate_record(NULL::public.transactions, restore_data)).*
    ON CONFLICT (id) DO UPDATE SET
      account_id=EXCLUDED.account_id, to_account_id=EXCLUDED.to_account_id,
      transaction_type=EXCLUDED.transaction_type, amount=EXCLUDED.amount, fee=EXCLUDED.fee,
      transaction_date=EXCLUDED.transaction_date, category=EXCLUDED.category,
      description=EXCLUDED.description, payment_method=EXCLUDED.payment_method,
      receipt_url=EXCLUDED.receipt_url, is_demo=EXCLUDED.is_demo, updated_at=EXCLUDED.updated_at,
      reference_number=EXCLUDED.reference_number, status=EXCLUDED.status,
      balance_after=EXCLUDED.balance_after, attachment=EXCLUDED.attachment;
  ELSIF e.entity_type = 'profiles' THEN
    INSERT INTO public.profiles SELECT (jsonb_populate_record(NULL::public.profiles, restore_data)).*
    ON CONFLICT (id) DO UPDATE SET
      full_name=EXCLUDED.full_name, email=EXCLUDED.email, currency=EXCLUDED.currency,
      allow_overdraft=EXCLUDED.allow_overdraft, updated_at=EXCLUDED.updated_at,
      phone=EXCLUDED.phone, address=EXCLUDED.address, profile_photo=EXCLUDED.profile_photo;
  ELSIF e.entity_type = 'backup_settings' THEN
    INSERT INTO public.backup_settings SELECT (jsonb_populate_record(NULL::public.backup_settings, restore_data)).*
    ON CONFLICT (user_id) DO UPDATE SET
      form_url=EXCLUDED.form_url, form_action_url=EXCLUDED.form_action_url,
      entry_map=EXCLUDED.entry_map, auto_backup=EXCLUDED.auto_backup,
      skip_duplicates=EXCLUDED.skip_duplicates, updated_at=EXCLUDED.updated_at,
      spreadsheet_url=EXCLUDED.spreadsheet_url, web_app_url=EXCLUDED.web_app_url,
      sheet_name=EXCLUDED.sheet_name;
  END IF;

  UPDATE public.backup_events SET restored_at=now() WHERE id=e.id;
  INSERT INTO public.backup_history (
    user_id, row_count, skipped_count, scope, status, duration_ms,
    backup_type, backup_status, storage_location, notes
  ) VALUES (
    uid, 1, 0, e.entity_type, 'success', 0,
    'restore', 'success', 'Kelola Cloud Database',
    'Restored version ' || e.id::text
  );
END;
$$;
REVOKE ALL ON FUNCTION public.restore_backup_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_backup_event(uuid) TO authenticated;