ALTER FUNCTION public.create_full_backup() SECURITY INVOKER;
ALTER FUNCTION public.restore_backup_event(uuid) SECURITY INVOKER;
GRANT INSERT ON public.backup_events TO authenticated;
CREATE POLICY "backup_events_insert_own"
  ON public.backup_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());