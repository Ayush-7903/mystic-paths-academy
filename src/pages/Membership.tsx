import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, CreditCard, Check } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Invalid email address" });
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" });

const Membership = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Clear any corrupted auth data first
    const clearCorruptedAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // If there's an error getting session, clear storage
        if (error) {
          await supabase.auth.signOut();
          localStorage.clear();
        } else if (session) {
          navigate("/dashboard");
        }
      } catch (error) {
        // Clear storage on any error
        localStorage.clear();
        await supabase.auth.signOut();
      }
    };
    
    clearCorruptedAuth();
  }, [navigate]);

  const handleMembershipSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (!fullName.trim()) {
        throw new Error("Full name is required");
      }
      if (!cardNumber.trim() || !expiryDate.trim() || !cvv.trim()) {
        throw new Error("All payment details are required");
      }
    } catch (error: any) {
      toast({
        title: "Validation Error",
        description: error.message || error.errors?.[0]?.message || "Invalid input",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Create user account
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (signupError) throw signupError;

      // Update profile to mark as member
      if (authData.user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            is_member: true,
            member_since: new Date().toISOString()
          })
          .eq('id', authData.user.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Welcome to the Spiritual Academy!",
        description: "Your membership is now active. Access all courses.",
      });
      navigate("/dashboard");
    } catch (error: any) {
      // Clear storage if authentication fails
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        localStorage.clear();
        await supabase.auth.signOut();
        toast({
          title: "Connection Error",
          description: "Please refresh the page and try again",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Membership signup failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url('/images/hero-bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <Card className="w-full max-w-2xl gradient-card shadow-glow">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-3xl">Become a Member</CardTitle>
          <CardDescription>Join our spiritual community and access all courses</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMembershipSignup} className="space-y-6">
            {/* Basic Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                Your Details
              </h3>
              <div className="space-y-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="Your Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">At least 6 characters</p>
              </div>
            </div>

            <Separator />

            {/* Payment Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Payment Details (Demo)
              </h3>
              <div className="p-4 bg-muted/50 rounded-md">
                <p className="text-sm text-muted-foreground mb-4">
                  This is a demo payment form. Use any test card details.
                </p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input
                      id="card-number"
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        type="text"
                        placeholder="MM/YY"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        type="text"
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-md p-4">
              <p className="text-sm font-medium">Membership Benefits:</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Access to all spiritual courses</li>
                <li>• Lifetime enrollment capability</li>
                <li>• Track your spiritual journey</li>
                <li>• Join our community of seekers</li>
              </ul>
            </div>

            <Button type="submit" className="w-full shadow-glow" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 w-4 h-4" />
                  Complete Membership
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already a member?{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto" 
                onClick={() => navigate("/auth")}
                type="button"
              >
                Login here
              </Button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Membership;
