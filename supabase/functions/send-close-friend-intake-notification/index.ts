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

/**
 * Send close friend intake push notification.
 * Triggered by client invocation after logging water.
 * Only notifies MUTUAL close friends (both users marked each other).
 * Rate limited: max 1 notification per logger→recipient pair per 60 minutes.
 */
Deno.serve(async (req: Request) => {
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
    const { userId, volume } = await req.json();
    console.log(`Intake notification request: userId=${userId}, volume=${volume}`);

    if (!userId || !volume) {
      return new Response(
        JSON.stringify({ error: "userId and volume are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify auth
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

    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user || user.id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Find mutual close friends:
    // People I marked as close AND who marked me as close
    const { data: iMarkedThem } = await serviceClient
      .from("close_friends")
      .select("friend_id")
      .eq("user_id", userId);

    const { data: theyMarkedMe } = await serviceClient
      .from("close_friends")
      .select("user_id")
      .eq("friend_id", userId);

    if (!iMarkedThem || !theyMarkedMe || iMarkedThem.length === 0 || theyMarkedMe.length === 0) {
      console.log(`No mutual close friends found. iMarkedThem=${JSON.stringify(iMarkedThem)}, theyMarkedMe=${JSON.stringify(theyMarkedMe)}`);
      return new Response(
        JSON.stringify({ message: "No mutual close friends" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute intersection — mutual close friends
    const iMarkedSet = new Set(iMarkedThem.map((r) => r.friend_id));
    const mutualCloseFriends = theyMarkedMe
      .map((r) => r.user_id)
      .filter((id) => iMarkedSet.has(id));

    console.log(`Mutual close friends: ${JSON.stringify(mutualCloseFriends)}`);

    if (mutualCloseFriends.length === 0) {
      return new Response(
        JSON.stringify({ message: "No mutual close friends" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get logger's username
    const { data: loggerProfile } = await serviceClient
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    if (!loggerProfile) {
      return new Response(
        JSON.stringify({ error: "Failed to get profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get FCM credentials
    const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT")!;
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;
    const accessToken = await getGoogleAccessToken(serviceAccount);
    console.log(`Got access token, length: ${accessToken?.length}, projectId: ${projectId}`);

    const username = loggerProfile.username;
    const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    // Process each mutual close friend
    for (const recipientId of mutualCloseFriends) {
      try {
        console.log(`Processing recipient: ${recipientId}`);
        // Get device tokens
        const { data: deviceTokens, error: tokensErr } = await serviceClient
          .from("device_tokens")
          .select("token")
          .eq("user_id", recipientId);

        console.log(`Device tokens for ${recipientId}: ${JSON.stringify(deviceTokens)}, error: ${JSON.stringify(tokensErr)}`);
        if (!deviceTokens || deviceTokens.length === 0) continue;

        // Check rate limit
        const { data: lastNotification } = await serviceClient
          .from("close_friend_notifications")
          .select("sent_at")
          .eq("logger_id", userId)
          .eq("recipient_id", recipientId)
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastNotification) {
          const lastSentAt = new Date(lastNotification.sent_at).getTime();
          if (now - lastSentAt < RATE_LIMIT_MS) continue; // Rate limited
        }

        // Record notification
        const { error: insertErr } = await serviceClient
          .from("close_friend_notifications")
          .insert({ logger_id: userId, recipient_id: recipientId });

        console.log(`Notification record insert error: ${JSON.stringify(insertErr)}`);

        // Send FCM v1 message
        for (const dt of deviceTokens) {
          console.log(`Sending FCM to token: ${dt.token.slice(0, 10)}...`);
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
                    title: "Close Friend Activity",
                    body: `${username} just drank ${volume}ml`,
                  },
                  data: {
                    type: "close_friend_intake",
                    friendId: userId,
                  },
                },
              }),
            }
          );
          const respBody = await resp.text();
          console.log(`FCM response: status=${resp.status}, body=${respBody}`);
          if (!resp.ok) {
            console.error(`FCM failed for ${recipientId}: ${resp.status}`);
          }
        }
      } catch (err) {
        console.error(`Error processing recipient ${recipientId}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-close-friend-intake-notification error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
