import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// PayPal API endpoints
const PAYPAL_BASE_URL = Deno.env.get("PAYPAL_MODE") === "live" 
  ? "https://api-m.paypal.com" 
  : "https://api-m.sandbox.paypal.com";

// Subscription plan IDs - these need to be created in PayPal Dashboard
const SUBSCRIPTION_PLANS = {
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

async function getSubscriptionDetails(accessToken: string, subscriptionId: string) {
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logStep("Error fetching subscription", { error, subscriptionId });
    return null;
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user has a stored PayPal subscription ID in profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("is_member, member_since, paypal_subscription_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      logStep("Error fetching profile", { error: profileError.message });
    }

    // If no PayPal subscription stored, return not subscribed
    if (!profile?.paypal_subscription_id) {
      logStep("No PayPal subscription ID found for user");
      return new Response(JSON.stringify({ 
        subscribed: profile?.is_member || false,
        tier: null,
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get PayPal access token and check subscription status
    const accessToken = await getPayPalAccessToken();
    logStep("PayPal access token obtained");

    const subscription = await getSubscriptionDetails(accessToken, profile.paypal_subscription_id);
    
    if (!subscription) {
      logStep("Subscription not found in PayPal");
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: null,
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Subscription fetched from PayPal", { 
      status: subscription.status,
      planId: subscription.plan_id 
    });

    const isActive = subscription.status === "ACTIVE" || subscription.status === "APPROVED";
    
    // Determine tier based on plan ID
    let tier: string | null = null;
    if (subscription.plan_id === SUBSCRIPTION_PLANS.monthly.plan_id) {
      tier = "monthly";
    } else if (subscription.plan_id === SUBSCRIPTION_PLANS.yearly.plan_id) {
      tier = "yearly";
    }

    // Get subscription end date from billing info
    let subscriptionEnd: string | null = null;
    if (subscription.billing_info?.next_billing_time) {
      subscriptionEnd = subscription.billing_info.next_billing_time;
    }

    // Update profile if subscription is active
    if (isActive && !profile.is_member) {
      const memberSince = subscription.start_time || new Date().toISOString();
      await supabaseClient
        .from("profiles")
        .update({ 
          is_member: true, 
          member_since: memberSince 
        })
        .eq("id", user.id);
      logStep("Updated profile to member status");
    } else if (!isActive && profile.is_member) {
      // Subscription cancelled or expired
      await supabaseClient
        .from("profiles")
        .update({ is_member: false })
        .eq("id", user.id);
      logStep("Updated profile to non-member status");
    }

    return new Response(JSON.stringify({
      subscribed: isActive,
      tier,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
