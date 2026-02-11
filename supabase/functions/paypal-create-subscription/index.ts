import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-CREATE-ORDER] ${step}${detailsStr}`);
};

const PAYPAL_BASE_URL = Deno.env.get("PAYPAL_MODE") === "live" 
  ? "https://api-m.paypal.com" 
  : "https://api-m.sandbox.paypal.com";

const TIER_PRICES: Record<string, { amount: string; description: string; duration_days: number }> = {
  monthly: {
    amount: "29.99",
    description: "Guardian Codex Access - 1 Month",
    duration_days: 30,
  },
  yearly: {
    amount: "299.99",
    description: "Guardian Codex Access - 1 Year",
    duration_days: 365,
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
    
    if (!tier || !TIER_PRICES[tier]) {
      throw new Error("Invalid tier. Must be 'monthly' or 'yearly'");
    }

    const tierConfig = TIER_PRICES[tier];
    logStep("Tier selected", { tier, amount: tierConfig.amount });

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

    // Check if user already has active membership
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("is_member, membership_expires_at")
      .eq("id", user.id)
      .single();

    if (profile?.is_member && profile?.membership_expires_at) {
      const expiresAt = new Date(profile.membership_expires_at);
      if (expiresAt > new Date()) {
        throw new Error("You already have an active membership. It expires on " + expiresAt.toLocaleDateString());
      }
    }

    // Create PayPal order
    const accessToken = await getPayPalAccessToken();
    
    const origin = req.headers.get("origin") || "https://guardiansofearth.lovable.app";
    
    const orderResponse = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: {
            currency_code: "AUD",
            value: tierConfig.amount,
          },
          description: tierConfig.description,
          custom_id: JSON.stringify({ userId: user.id, tier }),
        }],
        application_context: {
          brand_name: "Guardian Codex",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: `${origin}/membership?payment=success&tier=${tier}`,
          cancel_url: `${origin}/membership?payment=cancelled`,
        },
      }),
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.text();
      logStep("PayPal order creation failed", { error });
      throw new Error(`Failed to create PayPal order: ${error}`);
    }

    const order = await orderResponse.json();
    logStep("PayPal order created", { orderId: order.id, status: order.status });

    // Find approval URL
    const approvalUrl = order.links?.find((link: { rel: string; href: string }) => link.rel === "approve")?.href;

    return new Response(JSON.stringify({ 
      orderId: order.id,
      approvalUrl,
      tier,
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
