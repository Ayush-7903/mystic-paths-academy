import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-ACTIVATE-MEMBERSHIP] ${step}${detailsStr}`);
};

const TIER_DURATIONS: Record<string, number> = {
  monthly: 30,
  yearly: 365,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { sessionId, tier } = await req.json();

    if (!sessionId) throw new Error("Missing sessionId");
    if (!tier || !TIER_DURATIONS[tier]) throw new Error("Invalid tier");

    logStep("Verifying session", { sessionId, tier });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id });

    // Verify the Stripe checkout session
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { status: session.payment_status, mode: session.mode });

    if (session.payment_status !== "paid") {
      throw new Error(`Payment not completed. Status: ${session.payment_status}`);
    }

    // Calculate expiry date
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + TIER_DURATIONS[tier]);

    // Update user profile
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({
        is_member: true,
        member_since: now.toISOString(),
        membership_expires_at: expiresAt.toISOString(),
        membership_tier: tier,
        paypal_subscription_id: `stripe_${sessionId}`, // Store with prefix for identification
      })
      .eq("id", user.id);

    if (updateError) {
      logStep("Error updating profile", { error: updateError.message });
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    logStep("Profile updated successfully", { expiresAt: expiresAt.toISOString() });

    return new Response(JSON.stringify({
      success: true,
      subscribed: true,
      tier,
      subscription_end: expiresAt.toISOString(),
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
