import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2, BookOpen, Star, Crown, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/layout/Footer";
import { User } from "@supabase/supabase-js";

interface Course {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
}

const Courses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessonCounts, setLessonCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    fetchCourses();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    
    if (session?.user) {
      const { data } = await supabase.functions.invoke("check-subscription");
      setIsSubscribed(data?.subscribed ?? false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("id, title, description, image_url")
        .order("created_at", { ascending: true });

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      if (coursesData && coursesData.length > 0) {
        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("course_id");

        if (lessonsData) {
          const counts: Record<string, number> = {};
          lessonsData.forEach((lesson) => {
            counts[lesson.course_id] = (counts[lesson.course_id] || 0) + 1;
          });
          setLessonCounts(counts);
        }
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
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
      
      {/* Hero Section */}
      <div 
        className="pt-24 pb-16 relative"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6)), url('/images/hero-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
            <Star className="w-3 h-3 mr-1" /> Transformative Learning
          </Badge>
          <h1 className="text-5xl md:text-6xl mb-4 text-white drop-shadow-lg">
            Sacred Courses
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Explore transformative teachings designed to elevate your consciousness and unlock your divine potential
          </p>
        </div>
      </div>

      {/* Membership CTA - Show only for non-subscribers */}
      {!isSubscribed && (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-y border-primary/20 py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <Crown className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Unlock All Courses</h3>
                  <p className="text-muted-foreground text-sm">
                    Get full access to all {courses.length} courses with a Guardian membership
                  </p>
                </div>
              </div>
              <Link to="/membership">
                <Button className="shadow-glow">
                  <Crown className="w-4 h-4 mr-2" />
                  View Membership Plans
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="bg-primary/10 border-b border-primary/20 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{courses.length}</div>
              <div className="text-sm text-muted-foreground">Available Courses</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {Object.values(lessonCounts).reduce((a, b) => a + b, 0)}+
              </div>
              <div className="text-sm text-muted-foreground">Total Lessons</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="text-sm text-muted-foreground">Self-Paced Learning</div>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="container mx-auto px-4 py-16 flex-grow">
        {courses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No courses available yet</h2>
            <p className="text-muted-foreground">Check back soon for new teachings!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <Card 
                key={course.id} 
                className="gradient-card shadow-soft hover:shadow-medium transition-smooth overflow-hidden group flex flex-col"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={course.image_url || "/placeholder.svg"}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute top-3 right-3">
                    {isSubscribed ? (
                      <Badge className="bg-green-500/90 text-white">
                        <CheckCircle className="w-3 h-3 mr-1" /> Included
                      </Badge>
                    ) : (
                      <Badge className="bg-primary/90 text-primary-foreground">
                        <Crown className="w-3 h-3 mr-1" /> Members
                      </Badge>
                    )}
                  </div>
                </div>
                <CardHeader className="flex-grow">
                  <CardTitle className="text-2xl line-clamp-2">{course.title}</CardTitle>
                  <CardDescription className="text-base line-clamp-3">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {lessonCounts[course.id] || 0} lessons
                    </div>
                  </div>
                  <Link to={`/courses/${course.id}`}>
                    <Button className="w-full group/btn shadow-glow">
                      {isSubscribed ? 'Start Learning' : 'View Course'}
                      <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-smooth" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA for non-subscribers */}
      {!isSubscribed && courses.length > 0 && (
        <section className="py-12 bg-gradient-to-r from-primary/10 to-accent/10 border-t border-primary/20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Become a Guardian and unlock instant access to all courses, plus all future teachings we add.
            </p>
            <Link to="/membership">
              <Button size="lg" className="shadow-glow">
                <Crown className="w-5 h-5 mr-2" />
                Become a Guardian
              </Button>
            </Link>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default Courses;