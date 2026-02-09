import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-WEBHOOK] ${step}${detailsStr}`);
};

// PayPal API endpoints
const PAYPAL_BASE_URL = Deno.env.get("PAYPAL_MODE") === "live" 
  ? "https://api-m.paypal.com" 
  : "https://api-m.sandbox.paypal.com";

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

async function verifyWebhookSignature(
  req: Request,
  body: string
): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  
  if (!webhookId) {
    logStep("PAYPAL_WEBHOOK_ID not configured, skipping verification");
    return true; // Skip verification in development
  }

  const transmissionId = req.headers.get("paypal-transmission-id");
  const transmissionTime = req.headers.get("paypal-transmission-time");
  const certUrl = req.headers.get("paypal-cert-url");
  const authAlgo = req.headers.get("paypal-auth-algo");
  const transmissionSig = req.headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    logStep("Missing webhook signature headers");
    return false;
  }

  try {
    const accessToken = await getPayPalAccessToken();
    
    const verifyResponse = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });

    if (!verifyResponse.ok) {
      logStep("Webhook verification failed", { status: verifyResponse.status });
      return false;
    }

    const verifyResult = await verifyResponse.json();
    return verifyResult.verification_status === "SUCCESS";
  } catch (error) {
    logStep("Error verifying webhook", { error: String(error) });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const body = await req.text();
    
    // Verify webhook signature (optional in sandbox)
    const isValid = await verifyWebhookSignature(req, body);
    if (!isValid) {
      logStep("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const event = JSON.parse(body);
    logStep("Processing event", { type: event.event_type, id: event.id });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const resource = event.resource;

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
      case "BILLING.SUBSCRIPTION.RENEWED": {
        // Subscription activated or renewed
        const subscriptionId = resource.id;
        const subscriberEmail = resource.subscriber?.email_address;
        
        if (subscriberEmail) {
          // Find user by email and update profile
          const { data: users } = await supabaseClient.auth.admin.listUsers();
          const user = users?.users?.find(u => u.email === subscriberEmail);
          
          if (user) {
            await supabaseClient
              .from("profiles")
              .update({ 
                is_member: true,
                member_since: resource.start_time || new Date().toISOString(),
                paypal_subscription_id: subscriptionId
              })
              .eq("id", user.id);
            logStep("Subscription activated for user", { userId: user.id });
          }
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.EXPIRED":
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        // Subscription ended
        const subscriptionId = resource.id;
        
        // Find profile with this subscription ID
        const { data: profiles } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("paypal_subscription_id", subscriptionId);
        
        if (profiles && profiles.length > 0) {
          for (const profile of profiles) {
            await supabaseClient
              .from("profiles")
              .update({ 
                is_member: false,
                paypal_subscription_id: null
              })
              .eq("id", profile.id);
            logStep("Subscription ended for user", { userId: profile.id });
          }
        }
        break;
      }

      case "PAYMENT.SALE.COMPLETED": {
        // Payment received
        logStep("Payment received", { 
          amount: resource.amount?.total,
          currency: resource.amount?.currency 
        });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.event_type });
    }

    return new Response(JSON.stringify({ received: true }), {
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
