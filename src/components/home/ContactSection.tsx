import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import contactImage from "@/assets/contact-meditation.jpg";

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().email("Please enter a valid email").max(255),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

const ContactSection = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: { name: `${result.data.firstName} ${result.data.lastName}`, email: result.data.email, message: result.data.message },
      });
      if (error) throw error;

      toast({
        title: "Message sent ✨",
        description: "Thank you for reaching out. We'll get back to you soon.",
      });
      setForm({ firstName: "", lastName: "", email: "", message: "" });
    } catch (err) {
      console.error(err);
      toast({
        title: "Something went wrong",
        description: "Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-20 md:py-28 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl mb-4">Contact Us</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We'd love to hear from you. Reach out and let's begin your journey together.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch max-w-5xl mx-auto">
          {/* Left – Image */}
          <div className="hidden lg:block rounded-2xl overflow-hidden shadow-soft">
            <img
              src={contactImage}
              alt="Person meditating in a peaceful natural setting"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right – Form */}
          <Card className="gradient-card p-8 md:p-10 rounded-2xl shadow-soft border-border/50">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="home-firstName">First Name *</Label>
                <Input id="home-firstName" name="firstName" placeholder="First name" value={form.firstName} onChange={handleChange} maxLength={50} />
                {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="home-lastName">Last Name *</Label>
                <Input id="home-lastName" name="lastName" placeholder="Last name" value={form.lastName} onChange={handleChange} maxLength={50} />
                {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="home-email">Email *</Label>
                <Input id="home-email" name="email" type="email" placeholder="your@email.com" value={form.email} onChange={handleChange} maxLength={255} />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="home-message">Message *</Label>
                <Textarea id="home-message" name="message" placeholder="Tell us what's on your heart..." value={form.message} onChange={handleChange} rows={4} maxLength={5000} />
                {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
              </div>

              <Button type="submit" size="lg" className="w-full shadow-glow" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Submit"}
                <Send className="ml-2 w-4 h-4" />
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
