import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Check, Sparkles, Shield, BookOpen, RefreshCw, Crown, AlertCircle, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

interface SubscriptionStatus {
  subscribed: boolean;
  tier: string | null;
  subscription_end: string | null;
  expired?: boolean;
}

const MEMBERSHIP_FEATURES = [
  "Access to all current teachings and courses",
  "New content added regularly",
  "Future updates included during membership",
  "Full access to the Guardian Codex",
  "Track your learning progress",
  "Renew anytime after expiry",
];

const Membership = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [processingTier, setProcessingTier] = useState<"monthly" | "yearly" | null>(null);
  const [paymentGateway, setPaymentGateway] = useState<"paypal" | "stripe">("stripe");
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkSubscription();
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkSubscription();
      }
    });

    return () => authSub.unsubscribe();
  }, []);

  // Handle payment status from URL (return from PayPal or Stripe)
  useEffect(() => {
    const payment = searchParams.get("payment");
    const token = searchParams.get("token"); // PayPal order ID
    const tierParam = searchParams.get("tier");
    const gateway = searchParams.get("gateway");
    const sessionId = searchParams.get("session_id");

    if (payment === "success" && gateway === "stripe" && sessionId && tierParam) {
      // Stripe return - verify and activate
      activateStripe(sessionId, tierParam);
      navigate("/membership", { replace: true });
    } else if (payment === "success" && token && tierParam) {
      // PayPal return - capture the order
      captureOrder(token, tierParam);
      navigate("/membership", { replace: true });
    } else if (payment === "cancelled") {
      toast({
        title: "Payment cancelled",
        description: "You can purchase anytime you're ready.",
        variant: "destructive",
      });
      navigate("/membership", { replace: true });
    }
  }, [searchParams]);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("paypal-check-subscription");
      if (error) {
        console.error("Error checking subscription:", error);
        setSubscription({ subscribed: false, tier: null, subscription_end: null });
      } else {
        setSubscription(data);
        if (data?.expired) {
          toast({
            title: "Membership Expired",
            description: "Your membership has expired. Renew to continue accessing content.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      setSubscription({ subscribed: false, tier: null, subscription_end: null });
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    setRefreshing(true);
    await checkSubscription();
    setRefreshing(false);
    toast({
      title: "Status refreshed",
      description: "Your membership status has been updated.",
    });
  };

  const captureOrder = async (orderId: string, tier: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("paypal-activate-subscription", {
        body: { orderId, tier },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Payment successful!",
          description: "Welcome to the Guardian Codex. Enjoy your access!",
        });
        await checkSubscription();
      } else {
        throw new Error("Payment capture failed");
      }
    } catch (error) {
      console.error("Error capturing order:", error);
      toast({
        title: "Payment verification failed",
        description: "Please contact support if your payment was processed.",
        variant: "destructive",
      });
    }
  };

  const activateStripe = async (sessionId: string, tier: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("stripe-activate-membership", {
        body: { sessionId, tier },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Payment successful!",
          description: "Welcome to the Guardian Codex. Enjoy your access!",
        });
        await checkSubscription();
      } else {
        throw new Error("Stripe payment verification failed");
      }
    } catch (error) {
      console.error("Error verifying Stripe payment:", error);
      toast({
        title: "Payment verification failed",
        description: "Please contact support if your payment was processed.",
        variant: "destructive",
      });
    }
  };

  const handlePurchase = async (tier: "monthly" | "yearly") => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setProcessingTier(tier);

    try {
      if (paymentGateway === "stripe") {
        // Stripe flow
        const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
          body: { tier },
        });

        if (error) {
          const errorMessage = error.message || "";
          if (errorMessage.includes("already have an active")) {
            await checkSubscription();
            toast({ title: "Already Active", description: "You already have an active membership." });
            setProcessingTier(null);
            return;
          }
          throw error;
        }

        if (!data.url) {
          throw new Error("Failed to create Stripe checkout. Please try again.");
        }

        window.location.href = data.url;
      } else {
        // PayPal flow (existing)
        const { data, error } = await supabase.functions.invoke("paypal-create-subscription", {
          body: { tier },
        });

        if (error) {
          const errorMessage = error.message || "";
          if (errorMessage.includes("already have an active membership")) {
            await checkSubscription();
            toast({ title: "Already Active", description: "You already have an active membership." });
            setProcessingTier(null);
            return;
          }
          throw error;
        }

        if (!data.approvalUrl) {
          throw new Error("Failed to create PayPal order. Please try again.");
        }

        window.location.href = data.approvalUrl;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to start checkout";
      toast({
        title: "Checkout failed",
        description: message,
        variant: "destructive",
      });
      setProcessingTier(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isExpired = subscription?.expired || 
    (subscription?.subscription_end && new Date(subscription.subscription_end) < new Date());

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto space-y-6">
              <Badge variant="secondary" className="px-4 py-2">
                <Crown className="w-4 h-4 mr-2" />
                Guardian Codex Access
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                Unlock Your Spiritual Journey
              </h1>
              <p className="text-xl text-muted-foreground">
                Gain complete access to all teachings, courses, and future updates with a Guardian Codex membership.
              </p>
            </div>
          </div>
        </section>

        {/* Current Membership Status */}
        {subscription?.subscribed && !isExpired && (
          <section className="pb-12">
            <div className="container mx-auto px-4">
              <Card className="gradient-card shadow-elegant border-primary/30 max-w-2xl mx-auto">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/20">
                      <Shield className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl text-primary">Active Membership</CardTitle>
                  <CardDescription>
                    You have full access to all content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center space-y-2">
                    <p className="text-lg">
                      Plan: <span className="font-semibold text-primary capitalize">{subscription.tier}</span>
                    </p>
                    {subscription.subscription_end && (
                      <p className="text-muted-foreground">
                        Expires on: {formatDate(subscription.subscription_end)}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <Button onClick={refreshSubscription} variant="ghost" disabled={refreshing}>
                      {refreshing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Refresh Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Expired Notice */}
        {isExpired && (
          <section className="pb-8">
            <div className="container mx-auto px-4">
              <Card className="border-amber-500/30 bg-amber-500/5 max-w-2xl mx-auto">
                <CardContent className="flex items-start gap-3 p-6">
                  <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-500 mb-1">Membership Expired</p>
                    <p className="text-muted-foreground">
                      Your membership has expired. Choose a plan below to renew your access.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {/* Payment Method Selection + Pricing Cards */}
        {(!subscription?.subscribed || isExpired) && (
          <section className="py-12">
            <div className="container mx-auto px-4">
              {/* Payment Method Selector */}
              <div className="max-w-md mx-auto mb-10">
                <p className="text-center text-sm text-muted-foreground mb-3">Choose payment method</p>
                <RadioGroup
                  value={paymentGateway}
                  onValueChange={(v) => setPaymentGateway(v as "stripe" | "paypal")}
                  className="flex justify-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="stripe" id="stripe" />
                    <Label htmlFor="stripe" className="flex items-center gap-1.5 cursor-pointer">
                      <CreditCard className="w-4 h-4" />
                      Card (Stripe)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="paypal" id="paypal" />
                    <Label htmlFor="paypal" className="cursor-pointer">
                      PayPal
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Monthly Plan */}
                <Card className="gradient-card shadow-medium border-primary/20 relative overflow-hidden">
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl">Monthly Access</CardTitle>
                    <CardDescription>Perfect for exploring</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-primary">$29.99</div>
                      <p className="text-muted-foreground">AUD per month</p>
                    </div>
                    <ul className="space-y-3">
                      {MEMBERSHIP_FEATURES.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handlePurchase("monthly")}
                      className="w-full shadow-glow"
                      size="lg"
                      disabled={processingTier !== null}
                    >
                      {processingTier === "monthly" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Redirecting to {paymentGateway === "stripe" ? "Stripe" : "PayPal"}...
                        </>
                      ) : (
                        <>
                          {paymentGateway === "stripe" ? <CreditCard className="w-4 h-4 mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                          {isExpired ? "Renew Monthly" : "Get Monthly Access"}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Yearly Plan */}
                <Card className="gradient-card shadow-elegant border-primary/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold rounded-bl-lg">
                    Save $60
                  </div>
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl">Yearly Access</CardTitle>
                    <CardDescription>Best value for committed seekers</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-primary">$299.99</div>
                      <p className="text-muted-foreground">AUD per year</p>
                      <p className="text-sm text-primary mt-1">That's only ~$25/month!</p>
                    </div>
                    <ul className="space-y-3">
                      {MEMBERSHIP_FEATURES.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handlePurchase("yearly")}
                      className="w-full shadow-glow"
                      size="lg"
                      disabled={processingTier !== null}
                    >
                      {processingTier === "yearly" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Redirecting to {paymentGateway === "stripe" ? "Stripe" : "PayPal"}...
                        </>
                      ) : (
                        <>
                          {paymentGateway === "stripe" ? <CreditCard className="w-4 h-4 mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
                          {isExpired ? "Renew Yearly" : "Get Yearly Access"}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {!user && (
                <p className="text-center text-muted-foreground mt-8">
                  <Button variant="link" onClick={() => navigate("/auth")} className="text-primary">
                    Sign in
                  </Button>
                  {" "}or{" "}
                  <Button variant="link" onClick={() => navigate("/signup")} className="text-primary">
                    create an account
                  </Button>
                  {" "}to purchase
                </p>
              )}
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="py-16 bg-gradient-to-b from-background to-primary/5">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">What's Included</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="gradient-card shadow-soft text-center p-6">
                <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">All Teachings</h3>
                <p className="text-muted-foreground">
                  Access every course and teaching in the Guardian Codex library
                </p>
              </Card>
              <Card className="gradient-card shadow-soft text-center p-6">
                <RefreshCw className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Regular Updates</h3>
                <p className="text-muted-foreground">
                  New content added regularly, all included in your membership
                </p>
              </Card>
              <Card className="gradient-card shadow-soft text-center p-6">
                <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Easy Renewal</h3>
                <p className="text-muted-foreground">
                  Simply renew when your membership expires to continue access
                </p>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Membership;
