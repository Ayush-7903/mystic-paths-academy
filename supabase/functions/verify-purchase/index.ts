import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, courseId } = await req.json();
    
    if (!sessionId || !courseId) {
      throw new Error("Missing required fields: sessionId, courseId");
    }

    console.log(`Verifying purchase for session: ${sessionId}`);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ success: false, message: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify metadata matches
    if (session.metadata?.userId !== user.id || session.metadata?.courseId !== courseId) {
      return new Response(JSON.stringify({ success: false, message: "Invalid session" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create admin client to record purchase
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Record the purchase
    const { error: purchaseError } = await supabaseAdmin
      .from("purchases")
      .upsert({
        user_id: user.id,
        course_id: courseId,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        amount_cents: session.amount_total || 0,
        currency: session.currency || 'usd',
        status: 'completed',
        purchased_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,course_id',
      });

    if (purchaseError) {
      console.error("Error recording purchase:", purchaseError);
      throw purchaseError;
    }

    // Auto-enroll user
    await supabaseAdmin
      .from("enrollments")
      .upsert({
        user_id: user.id,
        course_id: courseId,
        progress: 0,
      }, {
        onConflict: 'user_id,course_id',
      });

    console.log(`Purchase verified and recorded for user ${user.id}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error verifying purchase:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
