import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Award, ArrowRight, ShoppingBag, GraduationCap, PlayCircle, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Footer } from "@/components/layout/Footer";

interface Purchase {
  id: string;
  course_id: string;
  purchased_at: string;
  courses: {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
  };
}

interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [progress, setProgress] = useState<Record<string, CourseProgress>>({});
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

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
        fetchPurchases(session.user.id),
        fetchProfile(session.user.id)
      ]);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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

  const fetchPurchases = async (userId: string) => {
    try {
      const { data: purchasesData, error } = await supabase
        .from("purchases")
        .select(`
          id,
          course_id,
          purchased_at,
          courses (
            id,
            title,
            description,
            image_url
          )
        `)
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("purchased_at", { ascending: false });

      if (error) throw error;
      
      const validPurchases = (purchasesData || []).filter(p => p.courses) as Purchase[];
      setPurchases(validPurchases);

      // Fetch progress for each purchased course
      if (validPurchases.length > 0) {
        await fetchProgress(userId, validPurchases);
      }
    } catch (error) {
      console.error("Error fetching purchases:", error);
    }
  };

  const fetchProgress = async (userId: string, purchasesList: Purchase[]) => {
    try {
      const progressData: Record<string, CourseProgress> = {};

      for (const purchase of purchasesList) {
        const courseId = purchase.course_id;

        // Get total lessons for this course
        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("id")
          .eq("course_id", courseId);

        // Get completed lessons for this user
        const { data: completionsData } = await supabase
          .from("lesson_completions")
          .select("lesson_id")
          .eq("user_id", userId);

        const totalLessons = lessonsData?.length || 0;
        const completedLessonIds = new Set(completionsData?.map(c => c.lesson_id) || []);
        
        // Count completed lessons for this course
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

  const totalCourses = purchases.length;
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
            Welcome back, {profileName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Seeker'}!
          </h1>
          <p className="text-lg text-white/80">
            Continue your spiritual journey
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex-grow">
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
                  <p className="text-sm text-muted-foreground">Courses Owned</p>
                  <p className="text-3xl font-bold text-primary">{totalCourses}</p>
                </div>
                <ShoppingBag className="w-10 h-10 text-primary/50" />
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
              My Courses
            </h2>
            <Link to="/courses">
              <Button variant="outline">
                Browse More Courses
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {purchases.length === 0 ? (
            <Card className="gradient-card border-primary/20">
              <CardContent className="py-16 text-center">
                <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start your spiritual journey by purchasing your first course
                </p>
                <Link to="/courses">
                  <Button className="shadow-glow">
                    Explore Courses
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchases.map((purchase) => {
                const courseProgress = progress[purchase.course_id];
                const isCompleted = courseProgress?.progressPercent === 100;
                const hasStarted = (courseProgress?.progressPercent || 0) > 0;

                return (
                  <Card 
                    key={purchase.id} 
                    className="gradient-card shadow-soft hover:shadow-medium transition-smooth overflow-hidden group flex flex-col"
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={purchase.courses.image_url || "/placeholder.svg"}
                        alt={purchase.courses.title}
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
                        {purchase.courses.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {purchase.courses.description}
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

                      <Link to={`/courses/${purchase.course_id}`}>
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