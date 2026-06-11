-- ============================================================
-- Webhook Trigger: intake_entries INSERT
-- Fires on new intake entries and calls the
-- send-close-friend-intake-notification Edge Function via pg_net
-- ============================================================

-- Enable pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function that builds the webhook payload and posts to the Edge Function
CREATE OR REPLACE FUNCTION public.handle_intake_entry_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
  request_id bigint;
BEGIN
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'intake_entries',
    'record', jsonb_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'volume', NEW.volume,
      'created_at', NEW.created_at
    )
  );

  SELECT net.http_post(
    url := (SELECT current_setting('app.settings.supabase_url', true) || '/functions/v1/send-close-friend-intake-notification'),
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key', true))
    )
  ) INTO request_id;

  RETURN NEW;
END;
$$;

-- Trigger that fires after each INSERT on intake_entries
CREATE TRIGGER on_intake_entry_insert
  AFTER INSERT ON public.intake_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_intake_entry_insert();
