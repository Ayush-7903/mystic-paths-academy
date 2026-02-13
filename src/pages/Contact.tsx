import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Send, CalendarDays, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().email("Please enter a valid email").max(255),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

const contactCards = [
  {
    icon: CalendarDays,
    title: "Book a Call",
    description: "Book a call at a time that suits you and get expert guidance before you begin.",
    action: "https://calendly.com/ayushsh-zedplus/30min",
    actionLabel: "Schedule Now",
  },
  {
    icon: Mail,
    title: "Email",
    description: "Have a question? Email us and we'll get back to you soon.",
    action: "mailto:ayushsh.zedplus@gmail.com",
    actionLabel: "ayushsh.zedplus@gmail.com",
  },
  {
    icon: Phone,
    title: "Phone",
    description: "For immediate assistance, reach out to us directly.",
    action: "tel:+1234567890",
    actionLabel: "+1 (234) 567-890",
  },
];

const Contact = () => {
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
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section
        className="relative min-h-[50vh] flex items-center justify-center overflow-hidden pt-16"
        style={{
          backgroundImage: `linear-gradient(135deg, hsl(150 40% 45% / 0.15), hsl(45 85% 75% / 0.1), hsl(260 60% 70% / 0.08))`,
        }}
      >
        <div className="absolute inset-0 gradient-hero opacity-60" />
        <div className="container mx-auto px-4 z-10 text-center animate-in fade-in duration-700">
          <h1 className="text-4xl md:text-6xl mb-4 text-foreground">
            Let's Align Your Energy
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Reach out to begin your manifestation journey with us.
          </p>
        </div>
      </section>

      {/* Main Two-Column Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">

            {/* Left – Contact Cards (1/4 width) */}
            <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-5 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2 scrollbar-thin">
              {contactCards.map((card) => (
                <a
                  key={card.title}
                  href={card.action}
                  target={card.action.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="group block rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-6 shadow-soft transition-all duration-300 hover:shadow-medium hover:-translate-y-1 hover:border-primary/30"
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <card.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground font-sans">{card.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                    <span className="text-sm font-medium text-primary">{card.actionLabel}</span>
                  </div>
                </a>
              ))}
            </div>

            {/* Right – Contact Form (3/4 width) */}
            <div className="lg:col-span-3">
              <h2 className="text-3xl md:text-4xl mb-2 text-foreground">Ready to get started?</h2>
              <p className="text-muted-foreground mb-8">Fill in the form and we'll be in touch shortly.</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" name="firstName" placeholder="First name" value={form.firstName} onChange={handleChange} maxLength={50} />
                    {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" name="lastName" placeholder="Last name" value={form.lastName} onChange={handleChange} maxLength={50} />
                    {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" placeholder="your@email.com" value={form.email} onChange={handleChange} maxLength={255} />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message *</Label>
                  <Textarea id="message" name="message" placeholder="Tell us what's on your heart..." value={form.message} onChange={handleChange} rows={5} maxLength={5000} />
                  {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
                </div>

                <Button type="submit" size="lg" className="shadow-glow" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Message"}
                  <Send className="ml-2 w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
