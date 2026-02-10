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

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    // Check profile for membership status
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("is_member, member_since, membership_expires_at, membership_tier")
      .eq("id", user.id)
      .single();

    if (profileError) {
      logStep("Error fetching profile", { error: profileError.message });
      return new Response(JSON.stringify({ 
        subscribed: false, tier: null, subscription_end: null, expired: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if membership has expired
    const now = new Date();
    let isActive = false;
    let expired = false;

    if (profile?.is_member && profile?.membership_expires_at) {
      const expiresAt = new Date(profile.membership_expires_at);
      if (expiresAt > now) {
        isActive = true;
      } else {
        // Membership expired - update profile
        expired = true;
        await supabaseClient
          .from("profiles")
          .update({ is_member: false })
          .eq("id", user.id);
        logStep("Membership expired, updated profile");
      }
    }

    logStep("Membership status", { isActive, expired, tier: profile?.membership_tier });

    return new Response(JSON.stringify({
      subscribed: isActive,
      tier: isActive ? profile?.membership_tier : null,
      subscription_end: profile?.membership_expires_at || null,
      expired,
    }), {
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
