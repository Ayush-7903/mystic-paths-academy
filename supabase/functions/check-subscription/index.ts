import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

const SUBSCRIPTION_TIERS: Record<string, { product_id: string; price_id: string; name: string; price_aud: number }> = {
  monthly: {
    product_id: "prod_Tnjncvsndg2NYh",
    price_id: "price_1Sq8KF1wrLc5KSQBVniYUJfA",
    name: "Guardian Codex Access - Monthly",
    price_aud: 30,
  },
  yearly: {
    product_id: "prod_TnjoM6SQJKQxSI",
    price_id: "price_1Sq8KW1wrLc5KSQBRXaFSpBa",
    name: "Guardian Codex Access - Yearly",
    price_aud: 300,
  },
};

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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning unsubscribed state");
      return new Response(JSON.stringify({ subscribed: false, tier: null, subscription_end: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let tier: string | null = null;
    let subscriptionEnd: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      logStep("Active subscription found", { subscriptionId: subscription.id });

      // Get real expiry from Stripe (auto-renewed by Stripe)
      try {
        if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
          subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        }
      } catch (dateError) {
        logStep("Error parsing current_period_end", { error: String(dateError) });
      }
      
      const productId = subscription.items.data[0]?.price?.product as string;
      
      if (productId === SUBSCRIPTION_TIERS.monthly.product_id) {
        tier = "monthly";
      } else if (productId === SUBSCRIPTION_TIERS.yearly.product_id) {
        tier = "yearly";
      } else {
        tier = "unknown";
      }
      logStep("Determined tier", { tier, productId, subscriptionEnd });
      
      let memberSince: string = new Date().toISOString();
      try {
        const startTimestamp = subscription.start_date ?? subscription.created;
        if (startTimestamp && typeof startTimestamp === 'number') {
          memberSince = new Date(startTimestamp * 1000).toISOString();
        }
      } catch (dateError) {
        logStep("Error parsing member_since date", { error: String(dateError) });
      }
      
      // Sync profile with Stripe's real subscription data
      await supabaseClient
        .from("profiles")
        .update({ 
          is_member: true, 
          member_since: memberSince,
          membership_expires_at: subscriptionEnd,
          membership_tier: tier,
        })
        .eq("id", user.id);
      logStep("Profile synced with Stripe subscription");
    } else {
      logStep("No active subscription found");
      await supabaseClient
        .from("profiles")
        .update({ is_member: false, membership_expires_at: null, membership_tier: null })
        .eq("id", user.id);
    }

    return new Response(JSON.stringify({ subscribed: hasActiveSub, tier, subscription_end: subscriptionEnd }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
