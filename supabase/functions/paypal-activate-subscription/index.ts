import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-ACTIVATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// PayPal API endpoints
const PAYPAL_BASE_URL = Deno.env.get("PAYPAL_MODE") === "live" 
  ? "https://api-m.paypal.com" 
  : "https://api-m.sandbox.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const { subscriptionId, tier } = await req.json();
    
    if (!subscriptionId) {
      throw new Error("Missing subscriptionId");
    }
    
    logStep("Activating subscription", { subscriptionId, tier });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    logStep("User authenticated", { userId: user.id });

    // Verify the subscription with PayPal
    const accessToken = await getPayPalAccessToken();
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to verify subscription with PayPal: ${error}`);
    }

    const subscription = await response.json();
    logStep("Subscription verified with PayPal", { 
      status: subscription.status,
      planId: subscription.plan_id 
    });

    if (subscription.status !== "ACTIVE" && subscription.status !== "APPROVED") {
      throw new Error(`Subscription is not active. Status: ${subscription.status}`);
    }

    // Update user profile with subscription info
    const memberSince = subscription.start_time || new Date().toISOString();
    
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ 
        is_member: true,
        member_since: memberSince,
        paypal_subscription_id: subscriptionId
      })
      .eq("id", user.id);

    if (updateError) {
      logStep("Error updating profile", { error: updateError.message });
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    logStep("Profile updated successfully");

    return new Response(JSON.stringify({ 
      success: true,
      subscribed: true,
      tier,
      subscription_end: subscription.billing_info?.next_billing_time || null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
