import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
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
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        logStep("Webhook signature verification failed", { message });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      event = JSON.parse(body);
      logStep("Processing webhook without signature verification");
    }

    logStep(`Processing webhook event: ${event.type}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle subscription events
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      logStep("Processing subscription event", { 
        subscriptionId: subscription.id, 
        status: subscription.status,
        customerId 
      });

      // Get customer email
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        logStep("Customer was deleted");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const email = customer.email;
      if (!email) {
        logStep("Customer has no email");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Find user by email
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.users?.find(u => u.email === email);
      
      if (!user) {
        logStep("No user found with email", { email });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Update profile based on subscription status
      const isActive = subscription.status === "active" || subscription.status === "trialing";
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          is_member: isActive,
          member_since: isActive ? new Date(subscription.start_date * 1000).toISOString() : null
        })
        .eq("id", user.id);

      if (profileError) {
        logStep("Error updating profile", { error: profileError.message });
      } else {
        logStep("Profile updated", { userId: user.id, isMember: isActive });
      }
    }

    // Handle subscription deleted/cancelled
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      logStep("Processing subscription deletion", { subscriptionId: subscription.id, customerId });

      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const email = customer.email;
      if (!email) {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const user = users?.users?.find(u => u.email === email);
      
      if (user) {
        await supabaseAdmin
          .from("profiles")
          .update({ is_member: false })
          .eq("id", user.id);
        logStep("Removed member status", { userId: user.id });
      }
    }

    // Keep legacy support for one-time course purchases
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only process one-time payments (legacy course purchases)
      if (session.mode === "payment") {
        const courseId = session.metadata?.courseId;
        const userId = session.metadata?.userId;
        
        if (courseId && userId) {
          logStep("Recording legacy course purchase", { userId, courseId });

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
            logStep("Error recording purchase", { error: purchaseError.message });
          }

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
            logStep("Error enrolling user", { error: enrollError.message });
          }

          logStep("Successfully processed legacy purchase", { userId, courseId });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("Webhook error", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
