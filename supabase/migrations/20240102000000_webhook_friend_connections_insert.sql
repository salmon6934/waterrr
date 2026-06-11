-- ============================================================
-- Webhook Trigger: friend_connections INSERT → send-push-notification
-- Fires on INSERT to friend_connections table and calls the
-- send-push-notification Edge Function via pg_net HTTP extension.
-- ============================================================

-- Ensure pg_net extension is available for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create webhook trigger function
CREATE OR REPLACE FUNCTION public.handle_friend_connection_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
  request_id bigint;
BEGIN
  -- Build the webhook payload matching the expected WebhookPayload interface
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'friend_connections',
    'record', jsonb_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'friend_id', NEW.friend_id,
      'status', NEW.status,
      'created_at', NEW.created_at
    )
  );

  -- Call the send-push-notification Edge Function via pg_net
  SELECT net.http_post(
    url := (SELECT current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification'),
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key', true))
    )
  ) INTO request_id;

  RETURN NEW;
END;
$$;

-- Create trigger that fires AFTER INSERT on friend_connections FOR EACH ROW
CREATE TRIGGER on_friend_connection_insert
  AFTER INSERT ON public.friend_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_friend_connection_insert();
