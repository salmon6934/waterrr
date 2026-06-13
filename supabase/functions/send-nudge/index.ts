import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Generate a Google OAuth2 access token from a service account using Web Crypto API.
 */
async function getGoogleAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  function base64url(data: string): string {
    return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signInput = `${encodedHeader}.${encodedPayload}`;

  const pemContent = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${signInput}.${encodedSignature}`;

  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

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

    // 2. Verify auth
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

    if (user.id !== senderId) {
      return new Response(
        JSON.stringify({ error: "senderId does not match authenticated user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Service-role client
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

      if (hoursSinceLastNudge < 0) {
        const expiresAt = new Date(
          lastSentAt.getTime() + 0 * 60 * 60 * 1000
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

    // 6. Query sender's username
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

    // 8. Send FCM v1 API message
    const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT")!;
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;

    const accessToken = await getGoogleAccessToken(serviceAccount);
    console.log(`Got FCM access token (length: ${accessToken.length}), project: ${projectId}`);

    const username = senderProfile.username;
    const nudgeBody = `${username} says: Stay hydrated! 💧`.slice(0, 100);

    const fcmPromises = deviceTokens.map(async (dt: { token: string }) => {
      const resp = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: dt.token,
              notification: {
                title: "Not Thirsty??",
                body: nudgeBody,
              },
              data: {
                type: "nudge",
                senderId,
              },
            },
          }),
        }
      );

      const responseBody = await resp.text();
      console.log(`FCM response for token ${dt.token.slice(0, 10)}...: status=${resp.status}, body=${responseBody}`);

      if (!resp.ok) {
        console.error(`FCM delivery failed: ${resp.status} ${responseBody}`);
      }

      return resp;
    });

    await Promise.allSettled(fcmPromises);

    // 9. Return success
    return new Response(
      JSON.stringify({ success: true, sentAt: nudgeRow.sent_at }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-nudge error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
