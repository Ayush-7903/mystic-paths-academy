import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Sparkles, Shield, BookOpen, RefreshCw, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

interface SubscriptionStatus {
  subscribed: boolean;
  tier: string | null;
  subscription_end: string | null;
}

const MEMBERSHIP_FEATURES = [
  "Access to all current teachings and courses",
  "New content added regularly",
  "Future updates included while subscribed",
  "Full access to the Guardian Codex",
  "Track your learning progress",
  "Cancel anytime",
];

const Membership = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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

  // Handle subscription status from URL
  useEffect(() => {
    const status = searchParams.get("subscription");
    if (status === "cancelled") {
      toast({
        title: "Checkout cancelled",
        description: "You can subscribe anytime you're ready.",
        variant: "destructive",
      });
      navigate("/membership", { replace: true });
    }
  }, [searchParams]);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.error("Error checking subscription:", error);
        // If there's an error, we still show the pricing - user can try to subscribe
        setSubscription({ subscribed: false, tier: null, subscription_end: null });
      } else {
        setSubscription(data);
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
      description: "Your subscription status has been updated.",
    });
  };

  const handleSubscribe = async (tier: "monthly" | "yearly") => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setCheckingOut(tier);
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
        body: { tier },
      });

      if (error) {
        // Parse error message for "already subscribed" case
        const errorMessage = error.message || "";
        if (errorMessage.includes("already have an active subscription")) {
          // User is already subscribed - refresh status and show their subscription
          await checkSubscription();
          toast({
            title: "Already Subscribed",
            description: "You already have an active membership. Refreshing your status...",
          });
          return;
        }
        throw error;
      }

      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to start checkout";
      // Check if error contains "already subscribed" message
      if (message.includes("already have an active subscription")) {
        await checkSubscription();
        toast({
          title: "Already Subscribed", 
          description: "You already have an active membership. Refreshing your status...",
        });
        return;
      }
      toast({
        title: "Checkout failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setCheckingOut(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;

      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to open portal";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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

        {/* Current Subscription Status */}
        {subscription?.subscribed && (
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
                        Renews on: {formatDate(subscription.subscription_end)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={handleManageSubscription} variant="outline">
                      Manage Subscription
                    </Button>
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

        {/* Pricing Cards */}
        {!subscription?.subscribed && (
          <section className="py-12">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Monthly Plan */}
                <Card className="gradient-card shadow-medium border-primary/20 relative overflow-hidden">
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl">Monthly Access</CardTitle>
                    <CardDescription>Perfect for exploring</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-primary">$30</div>
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
                      onClick={() => handleSubscribe("monthly")}
                      className="w-full shadow-glow"
                      size="lg"
                      disabled={checkingOut !== null}
                    >
                      {checkingOut === "monthly" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Subscribe Monthly
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
                      <div className="text-5xl font-bold text-primary">$300</div>
                      <p className="text-muted-foreground">AUD per year</p>
                      <p className="text-sm text-primary mt-1">That's only $25/month!</p>
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
                      onClick={() => handleSubscribe("yearly")}
                      className="w-full shadow-glow"
                      size="lg"
                      disabled={checkingOut !== null}
                    >
                      {checkingOut === "yearly" ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Crown className="w-4 h-4 mr-2" />
                          Subscribe Yearly
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
                  {" "}to subscribe
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
                <h3 className="text-xl font-semibold mb-2">Cancel Anytime</h3>
                <p className="text-muted-foreground">
                  No lock-in contracts. Cancel your subscription whenever you need
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
