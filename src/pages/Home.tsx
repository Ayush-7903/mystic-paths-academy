import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { ArrowRight, BookOpen, Users, Award } from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen">
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
          <h1 className="text-5xl md:text-7xl mb-6 text-white drop-shadow-lg">
            Awaken Your Divine Purpose
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
            Transform your consciousness through sacred teachings and spiritual activations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/courses">
              <Button size="lg" className="shadow-glow">
                Explore Courses
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                Start Your Journey
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl text-center mb-16">
            Your Path to Spiritual Mastery
          </h2>
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

      {/* CTA Section */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl mb-6">
            Ready to Begin Your Awakening?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of souls who have discovered their divine purpose through our transformative courses
          </p>
          <Link to="/courses">
            <Button size="lg" className="shadow-glow">
              View All Courses
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary py-8 border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 Spiritual Learning Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
