import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // 1. Parse request body
    const { senderId, receiverId } = await req.json();

    if (!senderId || !receiverId) {
      return new Response(
        JSON.stringify({ error: "senderId and receiverId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verify auth — extract JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create a client with the user's JWT to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify senderId matches the authenticated user
    if (user.id !== senderId) {
      return new Response(
        JSON.stringify({ error: "senderId does not match authenticated user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create service-role client for DB operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 4. Check nudge cooldown (24h from last nudge)
    const { data: lastNudge, error: nudgeQueryError } = await serviceClient
      .from("nudges")
      .select("sent_at")
      .eq("sender_id", senderId)
      .eq("receiver_id", receiverId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (nudgeQueryError) {
      return new Response(
        JSON.stringify({ error: "Failed to check nudge cooldown" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (lastNudge) {
      const lastSentAt = new Date(lastNudge.sent_at);
      const now = new Date();
      const hoursSinceLastNudge =
        (now.getTime() - lastSentAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastNudge < 24) {
        const expiresAt = new Date(
          lastSentAt.getTime() + 24 * 60 * 60 * 1000
        ).toISOString();
        return new Response(
          JSON.stringify({ error: "Nudge cooldown active", expiresAt }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 5. Query device_tokens for receiver
    const { data: deviceTokens, error: tokensError } = await serviceClient
      .from("device_tokens")
      .select("token")
      .eq("user_id", receiverId);

    if (tokensError) {
      return new Response(
        JSON.stringify({ error: "Failed to query device tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      return new Response(
        JSON.stringify({ error: "Recipient has no device tokens" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Query profiles for sender's username
    const { data: senderProfile, error: profileError } = await serviceClient
      .from("profiles")
      .select("username")
      .eq("id", senderId)
      .single();

    if (profileError || !senderProfile) {
      return new Response(
        JSON.stringify({ error: "Failed to get sender profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Insert nudge row
    const { data: nudgeRow, error: insertError } = await serviceClient
      .from("nudges")
      .insert({ sender_id: senderId, receiver_id: receiverId })
      .select("sent_at")
      .single();

    if (insertError || !nudgeRow) {
      return new Response(
        JSON.stringify({ error: "Failed to record nudge" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Send FCM message to all receiver tokens
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");
    const username = senderProfile.username;
    // Ensure body is max 100 chars
    const nudgeBody = `${username} says: Stay hydrated! 💧`.slice(0, 100);

    const fcmPromises = deviceTokens.map((dt: { token: string }) =>
      fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${fcmServerKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: dt.token,
          notification: {
            title: "Hydration Nudge",
            body: nudgeBody,
          },
          data: {
            type: "nudge",
            senderId,
          },
        }),
      })
    );

    await Promise.allSettled(fcmPromises);

    // 9. Return success
    return new Response(
      JSON.stringify({ success: true, sentAt: nudgeRow.sent_at }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
