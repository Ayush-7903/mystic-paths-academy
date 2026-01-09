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

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  try {
    let event: Stripe.Event;
    const body = await req.text();

    if (webhookSecret && signature) {
      // Verify webhook signature in production
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`Webhook signature verification failed: ${message}`);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // For testing without webhook signature
      event = JSON.parse(body);
      console.warn("Processing webhook without signature verification");
    }

    console.log(`Processing webhook event: ${event.type}`);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const courseId = session.metadata?.courseId;
      const userId = session.metadata?.userId;
      
      if (!courseId || !userId) {
        console.error("Missing metadata in checkout session");
        return new Response(JSON.stringify({ error: "Missing metadata" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Recording purchase for user ${userId}, course ${courseId}`);

      // Record the purchase
      const { error: purchaseError } = await supabaseAdmin
        .from("purchases")
        .upsert({
          user_id: userId,
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

      // Auto-enroll user in the course
      const { error: enrollError } = await supabaseAdmin
        .from("enrollments")
        .upsert({
          user_id: userId,
          course_id: courseId,
          progress: 0,
        }, {
          onConflict: 'user_id,course_id',
        });

      if (enrollError) {
        console.error("Error enrolling user:", enrollError);
        // Don't throw - purchase was recorded successfully
      }

      console.log(`Successfully processed purchase and enrollment for user ${userId}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
