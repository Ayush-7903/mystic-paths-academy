import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, BookOpen, Users, Award, Star, CheckCircle, Sparkles, Crown, Shield, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Course {
  id: string;
  title: string;
  image_url: string | null;
}

const Home = () => {
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [totalCourses, setTotalCourses] = useState(0);

  useEffect(() => {
    fetchFeaturedCourses();
  }, []);

  const fetchFeaturedCourses = async () => {
    const { data, count } = await supabase
      .from("courses")
      .select("id, title, image_url", { count: 'exact' })
      .limit(3);
    
    if (data) setFeaturedCourses(data);
    if (count) setTotalCourses(count);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section 
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5)), url('/images/hero-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 gradient-hero"></div>
        <div className="container mx-auto px-4 z-10 text-center">
          <Badge className="mb-6 bg-primary/20 text-white border-primary/30 text-sm py-1.5 px-4">
            <Sparkles className="w-4 h-4 mr-2" /> Transform Your Life Today
          </Badge>
          <h1 className="text-5xl md:text-7xl mb-6 text-white drop-shadow-lg">
            Awaken Your Divine Purpose
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
            Transform your consciousness through sacred teachings and spiritual activations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/membership">
              <Button size="lg" className="shadow-glow text-lg px-8">
                <Crown className="mr-2 w-5 h-5" />
                Become a Guardian
              </Button>
            </Link>
            <Link to="/courses">
              <Button size="lg" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-lg px-8">
                Explore Courses
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-6 bg-primary/10 border-y border-primary/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Unlimited Access</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Expert Instruction</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Self-Paced Learning</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Cancel Anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Highlight */}
      <section className="py-20 bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <Crown className="w-3 h-3 mr-1" /> Guardian Membership
            </Badge>
            <h2 className="text-4xl md:text-5xl mb-4">
              One Membership, Complete Access
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Unlock all {totalCourses}+ courses and future teachings with a single subscription
            </p>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="gradient-card p-6 text-center">
                <BookOpen className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">All Courses</h3>
                <p className="text-sm text-muted-foreground">Access every teaching in our library</p>
              </Card>
              <Card className="gradient-card p-6 text-center">
                <RefreshCw className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Regular Updates</h3>
                <p className="text-sm text-muted-foreground">New content added frequently</p>
              </Card>
              <Card className="gradient-card p-6 text-center">
                <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Flexible Plans</h3>
                <p className="text-sm text-muted-foreground">Monthly or yearly, cancel anytime</p>
              </Card>
            </div>
            <Link to="/membership">
              <Button size="lg" className="shadow-glow">
                View Membership Plans
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              Why Choose Us
            </Badge>
            <h2 className="text-4xl md:text-5xl mb-4">
              Your Path to Spiritual Mastery
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience transformative teachings designed to elevate your consciousness
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="gradient-card p-8 rounded-2xl shadow-soft hover:shadow-medium transition-smooth text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl mb-4">Sacred Knowledge</h3>
              <p className="text-muted-foreground">
                Access profound teachings that awaken your divine remembrance and spiritual gifts
              </p>
            </div>
            
            <div className="gradient-card p-8 rounded-2xl shadow-soft hover:shadow-medium transition-smooth text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl mb-4">Community Support</h3>
              <p className="text-muted-foreground">
                Join a global community of awakened souls on the path to higher consciousness
              </p>
            </div>
            
            <div className="gradient-card p-8 rounded-2xl shadow-soft hover:shadow-medium transition-smooth text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl mb-4">Personal Growth</h3>
              <p className="text-muted-foreground">
                Experience profound transformation through guided practices and activations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      {featuredCourses.length > 0 && (
        <section className="py-20 gradient-hero">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <Star className="w-3 h-3 mr-1" /> Featured
              </Badge>
              <h2 className="text-4xl md:text-5xl mb-4">
                Popular Courses
              </h2>
              <p className="text-xl text-muted-foreground">
                Preview our most popular teachings
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {featuredCourses.map((course) => (
                <Link key={course.id} to={`/courses/${course.id}`}>
                  <Card className="gradient-card shadow-soft hover:shadow-medium transition-smooth overflow-hidden group h-full">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={course.image_url || "/placeholder.svg"}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <Badge className="bg-primary/90 text-primary-foreground">
                          <Crown className="w-3 h-3 mr-1" /> Members Only
                        </Badge>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                      <Button variant="outline" className="w-full mt-4">
                        View Course
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link to="/courses">
                <Button size="lg" variant="outline" className="mr-4">
                  View All Courses
                </Button>
              </Link>
              <Link to="/membership">
                <Button size="lg" className="shadow-glow">
                  <Crown className="mr-2 w-5 h-5" />
                  Get Full Access
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section 
        className="py-20 relative"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url('/images/hero-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl mb-6 text-white">
            Ready to Begin Your Awakening?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of souls who have discovered their divine purpose through our transformative courses
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/membership">
              <Button size="lg" className="shadow-glow text-lg px-8">
                <Crown className="mr-2 w-5 h-5" />
                Become a Guardian
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-lg px-8">
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;