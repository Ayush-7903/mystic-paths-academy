import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Send, Sparkles, CalendarDays, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be under 100 characters"),
  email: z.string().trim().email("Please enter a valid email").max(255),
  manifestation: z.string().trim().max(500).optional(),
  message: z.string().trim().min(1, "Message is required").max(5000, "Message must be under 5000 characters"),
});

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", manifestation: "", message: "" });
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
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: result.data,
      });

      if (error) throw error;

      toast({
        title: "Message sent ✨",
        description: "Thank you for reaching out. We'll get back to you soon.",
      });
      setForm({ name: "", email: "", manifestation: "", message: "" });
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
        className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-16"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6)), url('/images/hero-bg.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 gradient-hero"></div>
        <div className="container mx-auto px-4 z-10 text-center">
          <Badge className="mb-6 bg-primary/20 text-white border-primary/30 text-sm py-1.5 px-4">
            <Sparkles className="w-4 h-4 mr-2" /> We're Listening
          </Badge>
          <h1 className="text-4xl md:text-6xl mb-6 text-white drop-shadow-lg">
            The Universe Brought You Here for a Reason
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
            Whether you're seeking guidance, ready to transform, or simply need someone to listen — we're here for you.
          </p>
          <a href="#contact-form">
            <Button size="lg" className="shadow-glow text-lg px-8">
              <Send className="mr-2 w-5 h-5" />
              Send a Message
            </Button>
          </a>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-form" className="py-20 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <Heart className="w-3 h-3 mr-1" /> Reach Out
              </Badge>
              <h2 className="text-3xl md:text-4xl mb-4">Send Us a Message</h2>
              <p className="text-muted-foreground text-lg">
                Share your journey with us. Every message is read and answered with care.
              </p>
            </div>

            <Card className="gradient-card p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={handleChange}
                    maxLength={100}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={handleChange}
                    maxLength={255}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manifestation">What are you trying to manifest?</Label>
                  <Input
                    id="manifestation"
                    name="manifestation"
                    placeholder="e.g., Inner peace, abundance, clarity..."
                    value={form.manifestation}
                    onChange={handleChange}
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us what's on your heart..."
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                    maxLength={5000}
                  />
                  {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
                </div>

                <Button type="submit" size="lg" className="w-full shadow-glow" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send a Message"}
                  <Send className="ml-2 w-4 h-4" />
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </section>

      {/* Book a Call Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <CalendarDays className="w-3 h-3 mr-1" /> Book a Call
            </Badge>
            <h2 className="text-3xl md:text-4xl mb-4">Let's Connect Personally</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Sometimes a conversation can shift everything. Schedule a free discovery call and let's explore how we can support your journey.
            </p>
            <div className="rounded-2xl overflow-hidden border shadow-soft bg-card">
              {/* Calendly Embed */}
              <iframe
                src="https://calendly.com/ayushsh-zedplus/30min"
                width="100%"
                height="700"
                frameBorder="0"
                title="Schedule a call"
                className="w-full"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Can't find a suitable time? <a href="#contact-form" className="text-primary hover:underline">Send us a message</a> and we'll work something out.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
