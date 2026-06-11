import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  type: "INSERT";
  table: "friend_connections";
  record: {
    user_id: string;
    friend_id: string;
    status: string;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Only process INSERT events on friend_connections
    if (payload.type !== "INSERT" || payload.table !== "friend_connections") {
      return new Response(JSON.stringify({ message: "Ignored event" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only send notifications for pending friend requests
    if (payload.record.status !== "pending") {
      return new Response(
        JSON.stringify({ message: "Skipped non-pending status" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { user_id: senderId, friend_id: recipientId } = payload.record;

    // Query device tokens for the recipient
    const { data: deviceTokens, error: tokensError } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", recipientId);

    if (tokensError) {
      console.error("Error fetching device tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch device tokens" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Skip silently if no device tokens found
    if (!deviceTokens || deviceTokens.length === 0) {
      return new Response(
        JSON.stringify({ message: "No device tokens found, skipping" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Query profiles for the sender's username
    const { data: senderProfile, error: profileError } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", senderId)
      .single();

    if (profileError || !senderProfile) {
      console.error("Error fetching sender profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch sender profile" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokens = deviceTokens.map((dt) => dt.token);
    const senderUsername = senderProfile.username;

    // Send FCM message using legacy HTTP API
    const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${fcmServerKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: {
          title: "New Friend Request",
          body: `${senderUsername} sent you a friend request`,
        },
        data: {
          type: "friend_request",
          senderId: senderId,
        },
      }),
    });

    if (!fcmResponse.ok) {
      const fcmError = await fcmResponse.text();
      console.error("FCM send failed:", fcmError);
      return new Response(
        JSON.stringify({ error: "Failed to send push notification" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const fcmResult = await fcmResponse.json();
    console.log("FCM send result:", JSON.stringify(fcmResult));

    return new Response(
      JSON.stringify({ message: "Notification sent successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
