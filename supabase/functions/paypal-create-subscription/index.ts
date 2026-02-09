import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-CREATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// PayPal API endpoints
const PAYPAL_BASE_URL = Deno.env.get("PAYPAL_MODE") === "live" 
  ? "https://api-m.paypal.com" 
  : "https://api-m.sandbox.paypal.com";

// Subscription plan IDs - these need to be created in PayPal Dashboard
const SUBSCRIPTION_PLANS: Record<string, { plan_id: string; name: string }> = {
  monthly: {
    plan_id: Deno.env.get("PAYPAL_MONTHLY_PLAN_ID") || "",
    name: "Guardian Codex Access - Monthly",
  },
  yearly: {
    plan_id: Deno.env.get("PAYPAL_YEARLY_PLAN_ID") || "",
    name: "Guardian Codex Access - Yearly",
  },
};

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
    
    const { tier } = await req.json();
    
    if (!tier || !SUBSCRIPTION_PLANS[tier]) {
      throw new Error("Invalid tier. Must be 'monthly' or 'yearly'");
    }

    const planId = SUBSCRIPTION_PLANS[tier].plan_id;
    if (!planId) {
      throw new Error(`PayPal plan ID not configured for tier: ${tier}. Please set PAYPAL_${tier.toUpperCase()}_PLAN_ID in secrets.`);
    }
    
    logStep("Tier selected", { tier, planId });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user already has an active subscription
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("is_member, paypal_subscription_id")
      .eq("id", user.id)
      .single();

    if (profile?.is_member && profile?.paypal_subscription_id) {
      // Verify the subscription is still active in PayPal
      const accessToken = await getPayPalAccessToken();
      const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${profile.paypal_subscription_id}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        const subscription = await response.json();
        if (subscription.status === "ACTIVE") {
          throw new Error("You already have an active subscription. Please manage it from your dashboard.");
        }
      }
    }

    // Get PayPal Client ID to return to frontend
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    
    // Return the plan ID and client ID - the actual subscription creation
    // happens on the frontend using PayPal JS SDK
    return new Response(JSON.stringify({ 
      planId,
      clientId,
      userId: user.id,
      tier
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
