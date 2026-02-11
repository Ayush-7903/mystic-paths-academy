import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Award, ArrowRight, Crown, GraduationCap, PlayCircle, Settings, RefreshCw, Shield, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Footer } from "@/components/layout/Footer";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
}

interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<Record<string, CourseProgress>>({});
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      
      // Check if user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .single();
      
      if (roleData) {
        setIsAdmin(true);
      }

      await Promise.all([
        checkSubscription(),
        fetchProfile(session.user.id)
      ]);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => authSub.unsubscribe();
  }, [navigate]);

  // Fetch courses after subscription status is known
  useEffect(() => {
    if (user && subscription !== null) {
      if (subscription.subscribed) {
        fetchAllCourses(user.id);
      } else {
        fetchPurchasedCourses(user.id);
      }
    }
  }, [user, subscription]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single();

      if (data) {
        setProfileName(data.full_name);
      }
    } catch {
      // Use email as fallback
    }
  };

  const checkSubscription = async () => {
    try {
      // Check PayPal membership first
      const { data: paypalData } = await supabase.functions.invoke("paypal-check-subscription");
      if (paypalData?.subscribed) {
        setSubscription({
          subscribed: true,
          product_id: paypalData.tier || null,
          subscription_end: paypalData.subscription_end || null,
        });
        return;
      }

      // Fallback to Stripe
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error("Error checking subscription:", error);
      setSubscription({ subscribed: false, product_id: null, subscription_end: null });
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

  const fetchAllCourses = async (userId: string) => {
    try {
      const { data: coursesData, error } = await supabase
        .from("courses")
        .select("id, title, description, image_url")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setCourses(coursesData || []);

      if (coursesData && coursesData.length > 0) {
        await fetchProgress(userId, coursesData);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchPurchasedCourses = async (userId: string) => {
    try {
      const { data: purchasesData, error } = await supabase
        .from("purchases")
        .select(`
          course_id,
          courses (
            id,
            title,
            description,
            image_url
          )
        `)
        .eq("user_id", userId)
        .eq("status", "completed");

      if (error) throw error;
      
      const validCourses = (purchasesData || [])
        .filter(p => p.courses)
        .map(p => p.courses as Course);
      
      setCourses(validCourses);

      if (validCourses.length > 0) {
        await fetchProgress(userId, validCourses);
      }
    } catch (error) {
      console.error("Error fetching purchases:", error);
    }
  };

  const fetchProgress = async (userId: string, coursesList: Course[]) => {
    try {
      const progressData: Record<string, CourseProgress> = {};

      for (const course of coursesList) {
        const courseId = course.id;

        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("id")
          .eq("course_id", courseId);

        const { data: completionsData } = await supabase
          .from("lesson_completions")
          .select("lesson_id")
          .eq("user_id", userId);

        const totalLessons = lessonsData?.length || 0;
        const completedLessonIds = new Set(completionsData?.map(c => c.lesson_id) || []);
        const completedLessons = lessonsData?.filter(l => completedLessonIds.has(l.id)).length || 0;
        
        const progressPercent = totalLessons > 0 
          ? Math.round((completedLessons / totalLessons) * 100) 
          : 0;

        progressData[courseId] = {
          courseId,
          totalLessons,
          completedLessons,
          progressPercent
        };
      }

      setProgress(progressData);
    } catch (error) {
      console.error("Error fetching progress:", error);
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

  const totalCourses = courses.length;
  const completedCourses = Object.values(progress).filter(p => p.progressPercent === 100).length;
  const inProgressCourses = Object.values(progress).filter(p => p.progressPercent > 0 && p.progressPercent < 100).length;
  const overallProgress = totalCourses > 0 
    ? Math.round(Object.values(progress).reduce((sum, p) => sum + p.progressPercent, 0) / totalCourses)
    : 0;

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
        className="pt-24 pb-12"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6)), url('/images/hero-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl mb-2 text-white drop-shadow-lg">
            Welcome back, {profileName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guardian'}!
          </h1>
          <p className="text-lg text-white/80">
            Continue your spiritual journey
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex-grow">
        {/* Subscription Status Card */}
        <Card className={`mb-6 shadow-elegant border-2 ${subscription?.subscribed ? 'gradient-card border-primary/40' : 'bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20'}`}>
          <CardContent className="pt-6">
            {subscription?.subscribed ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/20">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-primary">Guardian Member</h3>
                      <Badge className="bg-primary/20 text-primary border-primary/30">Active</Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4" />
                      {subscription.subscription_end 
                        ? `Renews on ${formatDate(subscription.subscription_end)}`
                        : 'Full access to all courses'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleManageSubscription} variant="outline" size="sm">
                    Manage Subscription
                  </Button>
                  <Button onClick={refreshSubscription} variant="ghost" size="sm" disabled={refreshing}>
                    {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-muted">
                    <Crown className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Unlock Full Access</h3>
                    <p className="text-muted-foreground">
                      Become a Guardian to access all courses and future content
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to="/membership">
                    <Button className="shadow-glow">
                      <Crown className="w-4 h-4 mr-2" />
                      Become a Guardian
                    </Button>
                  </Link>
                  <Button onClick={refreshSubscription} variant="ghost" size="sm" disabled={refreshing}>
                    {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Access */}
        {isAdmin && (
          <Card className="gradient-card shadow-soft border-primary mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 w-5 h-5" />
                Admin Access
              </CardTitle>
              <CardDescription>Manage courses and content</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/admin">
                <Button>Go to Admin Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="gradient-card border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {subscription?.subscribed ? 'Available Courses' : 'Courses Owned'}
                  </p>
                  <p className="text-3xl font-bold text-primary">{totalCourses}</p>
                </div>
                <BookOpen className="w-10 h-10 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-green-500">{completedCourses}</p>
                </div>
                <Award className="w-10 h-10 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-3xl font-bold text-yellow-500">{inProgressCourses}</p>
                </div>
                <PlayCircle className="w-10 h-10 text-yellow-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Progress</p>
                  <p className="text-3xl font-bold text-primary">{overallProgress}%</p>
                </div>
                <GraduationCap className="w-10 h-10 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Courses Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              {subscription?.subscribed ? 'Your Courses' : 'My Courses'}
            </h2>
            <Link to="/courses">
              <Button variant="outline">
                Browse All Courses
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {courses.length === 0 ? (
            <Card className="gradient-card border-primary/20">
              <CardContent className="py-16 text-center">
                <Crown className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
                <p className="text-muted-foreground mb-6">
                  {subscription?.subscribed 
                    ? "Explore our catalog to start your learning journey"
                    : "Become a Guardian to access all our sacred teachings"}
                </p>
                <Link to={subscription?.subscribed ? "/courses" : "/membership"}>
                  <Button className="shadow-glow">
                    {subscription?.subscribed ? (
                      <>Explore Courses</>
                    ) : (
                      <>
                        <Crown className="mr-2 w-4 h-4" />
                        Become a Guardian
                      </>
                    )}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => {
                const courseProgress = progress[course.id];
                const isCompleted = courseProgress?.progressPercent === 100;
                const hasStarted = (courseProgress?.progressPercent || 0) > 0;

                return (
                  <Card 
                    key={course.id} 
                    className="gradient-card shadow-soft hover:shadow-medium transition-smooth overflow-hidden group flex flex-col"
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={course.image_url || "/placeholder.svg"}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                      />
                      <div className="absolute top-3 right-3">
                        {isCompleted ? (
                          <Badge className="bg-green-500 text-white">
                            <Award className="w-3 h-3 mr-1" /> Completed
                          </Badge>
                        ) : hasStarted ? (
                          <Badge className="bg-yellow-500 text-white">
                            In Progress
                          </Badge>
                        ) : (
                          <Badge className="bg-primary text-primary-foreground">
                            Not Started
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardHeader className="pb-2 flex-grow">
                      <CardTitle className="text-lg line-clamp-2">
                        {course.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {course.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Progress Bar */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium text-primary">
                            {courseProgress?.progressPercent || 0}%
                          </span>
                        </div>
                        <Progress value={courseProgress?.progressPercent || 0} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {courseProgress?.completedLessons || 0} of {courseProgress?.totalLessons || 0} lessons
                        </p>
                      </div>

                      <Link to={`/courses/${course.id}`}>
                        <Button className="w-full shadow-glow">
                          {isCompleted ? "Review Course" : hasStarted ? "Continue Learning" : "Start Learning"}
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;