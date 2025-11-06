import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, BookOpen, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

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

    fetchEnrollments(session.user.id);
  };

  const fetchEnrollments = async (userId: string) => {
    try {
      const { data, error } = await supabase
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

      if (error) throw error;
      setEnrollments(data || []);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
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

        <h2 className="text-3xl mb-6">Your Enrolled Courses</h2>
        
        {enrollments.length === 0 ? (
          <Card className="gradient-card shadow-soft text-center p-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-2xl mb-2">No Courses Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start your spiritual journey by enrolling in a course
            </p>
            <Link to="/courses">
              <Button>Browse Courses</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {enrollments.map((enrollment) => (
              <Card 
                key={enrollment.id}
                className="gradient-card shadow-soft hover:shadow-medium transition-smooth"
              >
                <div className="relative h-48 overflow-hidden rounded-t-lg">
                  <img
                    src={enrollment.courses.image_url || "/placeholder.svg"}
                    alt={enrollment.courses.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle>{enrollment.courses.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {enrollment.courses.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{enrollment.progress}%</span>
                    </div>
                    <Progress value={enrollment.progress} />
                  </div>
                  <Link to={`/courses/${enrollment.courses.id}`}>
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
  );
};

export default Dashboard;
