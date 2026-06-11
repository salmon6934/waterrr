import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  type: "INSERT";
  table: "intake_entries";
  record: {
    id: string;
    user_id: string;
    volume: number;
    created_at: string;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Only process INSERT events on intake_entries
    if (payload.type !== "INSERT" || payload.table !== "intake_entries") {
      return new Response(JSON.stringify({ message: "Ignored event" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const loggerId = payload.record.user_id;
    const volume = payload.record.volume;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Find all users who designated the logger as a close friend
    const { data: closeFriends, error: closeFriendsError } = await supabase
      .from("close_friends")
      .select("user_id")
      .eq("friend_id", loggerId);

    if (closeFriendsError) {
      console.error("Error fetching close friends:", closeFriendsError);
      return new Response(JSON.stringify({ message: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no close friends found, return 200 immediately
    if (!closeFriends || closeFriends.length === 0) {
      return new Response(
        JSON.stringify({ message: "No close friends found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Query logger's profile for username (do this once, outside the loop)
    const { data: loggerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", loggerId)
      .single();

    if (profileError || !loggerProfile) {
      console.error("Error fetching logger profile:", profileError);
      return new Response(JSON.stringify({ message: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const username = loggerProfile.username;
    const now = Date.now();
    const RATE_LIMIT_MS = 60 * 60 * 1000; // 60 minutes in milliseconds

    // Process each recipient
    for (const recipient of closeFriends) {
      try {
        const recipientId = recipient.user_id;

        // Query device_tokens for recipient — skip if none found
        const { data: deviceTokens, error: tokensError } = await supabase
          .from("device_tokens")
          .select("token")
          .eq("user_id", recipientId);

        if (tokensError) {
          console.error(
            `Error fetching tokens for ${recipientId}:`,
            tokensError
          );
          continue;
        }

        if (!deviceTokens || deviceTokens.length === 0) {
          continue;
        }

        // Check rate limit — query most recent notification for this (logger, recipient) pair
        const { data: lastNotification, error: notifError } = await supabase
          .from("close_friend_notifications")
          .select("sent_at")
          .eq("logger_id", loggerId)
          .eq("recipient_id", recipientId)
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (notifError) {
          console.error(
            `Error checking rate limit for ${recipientId}:`,
            notifError
          );
          continue;
        }

        // Enforce 60-minute sliding window rate limit
        if (lastNotification) {
          const lastSentAt = new Date(lastNotification.sent_at).getTime();
          if (now - lastSentAt < RATE_LIMIT_MS) {
            // Rate limited — skip this recipient
            continue;
          }
        }

        // INSERT into close_friend_notifications
        const { error: insertError } = await supabase
          .from("close_friend_notifications")
          .insert({
            logger_id: loggerId,
            recipient_id: recipientId,
          });

        if (insertError) {
          console.error(
            `Error inserting notification record for ${recipientId}:`,
            insertError
          );
          continue;
        }

        // Send FCM message to all recipient tokens
        const tokens = deviceTokens.map((dt) => dt.token);

        const fcmResponse = await fetch(
          "https://fcm.googleapis.com/fcm/send",
          {
            method: "POST",
            headers: {
              Authorization: `key=${fcmServerKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              registration_ids: tokens,
              notification: {
                title: "Close Friend Activity",
                body: `${username} just drank ${volume}ml`,
              },
              data: {
                type: "close_friend_intake",
                friendId: loggerId,
              },
            }),
          }
        );

        if (!fcmResponse.ok) {
          const fcmError = await fcmResponse.text();
          console.error(`FCM send failed for ${recipientId}:`, fcmError);
        } else {
          const fcmResult = await fcmResponse.json();
          console.log(
            `FCM send result for ${recipientId}:`,
            JSON.stringify(fcmResult)
          );
        }
      } catch (recipientError) {
        // Per-recipient try/catch — one failure doesn't stop processing others
        console.error(
          `Error processing recipient ${recipient.user_id}:`,
          recipientError
        );
      }
    }

    return new Response(
      JSON.stringify({ message: "Processing complete" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    // Always return 200 — fire-and-forget from webhook perspective
    return new Response(
      JSON.stringify({ message: "ok" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
