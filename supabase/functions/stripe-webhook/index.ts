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

const PRODUCT_TO_TIER: Record<string, string> = {
  "prod_Tnjncvsndg2NYh": "monthly",
  "prod_TnjoM6SQJKQxSI": "yearly",
};

async function findUserByEmail(supabaseAdmin: ReturnType<typeof createClient>, email: string) {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  return users?.users?.find(u => u.email === email) ?? null;
}

async function updateMembershipFromSubscription(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  subscription: Stripe.Subscription,
  isActive: boolean
) {
  if (!isActive) {
    await supabaseAdmin.from("profiles").update({ is_member: false, membership_expires_at: null, membership_tier: null }).eq("id", userId);
    logStep("Removed member status", { userId });
    return;
  }

  const productId = subscription.items.data[0]?.price?.product as string;
  const tier = PRODUCT_TO_TIER[productId] ?? "unknown";
  const memberSince = new Date(subscription.start_date * 1000).toISOString();
  const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();

  await supabaseAdmin.from("profiles").update({
    is_member: true,
    member_since: memberSince,
    membership_expires_at: expiresAt,
    membership_tier: tier,
    paypal_subscription_id: `stripe_sub_${subscription.id}`,
  }).eq("id", userId);

  logStep("Updated membership", { userId, tier, expiresAt });
}

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

    logStep(`Event: ${event.type}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle subscription created/updated (includes renewals)
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      logStep("Subscription event", { subscriptionId: subscription.id, status: subscription.status, customerId });

      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted || !customer.email) {
        return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
      }

      const user = await findUserByEmail(supabaseAdmin, customer.email);
      if (user) {
        const isActive = subscription.status === "active" || subscription.status === "trialing";
        await updateMembershipFromSubscription(supabaseAdmin, user.id, subscription, isActive);
      }
    }

    // Handle subscription deleted/cancelled
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      logStep("Subscription deleted", { subscriptionId: subscription.id, customerId });

      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted || !customer.email) {
        return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
      }

      const user = await findUserByEmail(supabaseAdmin, customer.email);
      if (user) {
        await updateMembershipFromSubscription(supabaseAdmin, user.id, subscription, false);
      }
    }

    // Handle invoice.paid - this fires on every successful renewal payment
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      if (subscriptionId) {
        logStep("Invoice paid for subscription renewal", { subscriptionId, invoiceId: invoice.id });

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);

        if (!customer.deleted && customer.email) {
          const user = await findUserByEmail(supabaseAdmin, customer.email);
          if (user) {
            await updateMembershipFromSubscription(supabaseAdmin, user.id, subscription, true);
            logStep("Membership renewed via invoice.paid", { userId: user.id });
          }
        }
      }
    }

    // Handle payment failure - notify but don't immediately revoke
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Payment failed", { invoiceId: invoice.id, subscriptionId: invoice.subscription });
      // Stripe will retry per your retry settings. Subscription status changes to 
      // "past_due" which will be caught by subscription.updated event above.
    }

    // Legacy: one-time course purchases
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment") {
        const courseId = session.metadata?.courseId;
        const userId = session.metadata?.userId;
        if (courseId && userId) {
          logStep("Legacy course purchase", { userId, courseId });
          await supabaseAdmin.from("purchases").upsert({
            user_id: userId, course_id: courseId,
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string,
            amount_cents: session.amount_total || 0,
            currency: session.currency || 'usd',
            status: 'completed',
            purchased_at: new Date().toISOString(),
          }, { onConflict: 'user_id,course_id' });

          await supabaseAdmin.from("enrollments").upsert({
            user_id: userId, course_id: courseId, progress: 0,
          }, { onConflict: 'user_id,course_id' });
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
