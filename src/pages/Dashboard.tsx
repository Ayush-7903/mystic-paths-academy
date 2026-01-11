import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, BookOpen, Settings, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface PurchasedCourse {
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

interface Enrollment {
  id: string;
  progress: number;
  courses: {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
  };
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [purchases, setPurchases] = useState<PurchasedCourse[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

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

    // Fetch user's purchases and enrollments
    await fetchUserData(session.user.id);
  };

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch purchases
      const { data: purchasesData, error: purchasesError } = await supabase
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
        .eq("status", "completed");

      if (purchasesError) throw purchasesError;
      setPurchases(purchasesData || []);

      // Fetch enrollments with progress
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select(`
          id,
          progress,
          courses (
            id,
            title,
            description,
            image_url
          )
        `)
        .eq("user_id", userId);

      if (enrollmentsError) throw enrollmentsError;
      setEnrollments(enrollmentsData || []);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Combine purchases with enrollment progress
  const getProgress = (courseId: string) => {
    const enrollment = enrollments.find(e => e.courses.id === courseId);
    return enrollment?.progress || 0;
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
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-16 gradient-hero">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl md:text-6xl mb-4">
            Welcome Back, {user?.user_metadata?.full_name || "Seeker"}
          </h1>
          <p className="text-xl text-muted-foreground">
            Continue your journey toward enlightenment
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {isAdmin && (
          <div className="mb-8">
            <Card className="gradient-card shadow-soft border-primary">
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
          </div>
        )}

        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl flex items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-primary" />
              Your Purchased Courses
            </h2>
            <Link to="/courses">
              <Button variant="outline">Browse More Courses</Button>
            </Link>
          </div>
          
          {purchases.length === 0 ? (
            <Card className="gradient-card shadow-soft text-center p-12">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-2xl mb-2">No Courses Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start your spiritual journey by purchasing a course
              </p>
              <Link to="/courses">
                <Button className="shadow-glow">Browse Courses</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {purchases.map((purchase) => (
                <Card 
                  key={purchase.id}
                  className="gradient-card shadow-soft hover:shadow-medium transition-smooth"
                >
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    <img
                      src={purchase.courses.image_url || "/placeholder.svg"}
                      alt={purchase.courses.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle>{purchase.courses.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {purchase.courses.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{getProgress(purchase.courses.id)}%</span>
                      </div>
                      <Progress value={getProgress(purchase.courses.id)} />
                    </div>
                    <Link to={`/courses/${purchase.courses.id}`}>
                      <Button className="w-full">
                        Continue Course
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
