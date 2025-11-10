import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

interface Course {
  id: string;
  title: string;
  description: string;
  video_url: string;
  image_url: string | null;
}

const CourseDetail = () => {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkMembership(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkMembership(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkMembership = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("is_member")
        .eq("id", userId)
        .single();
      
      if (data?.is_member) {
        setIsMember(true);
      }
    } catch (error) {
      console.error("Error checking membership:", error);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCourse();
      if (user) {
        checkEnrollment();
      }
    }
  }, [id, user]);

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setCourse(data);
    } catch (error) {
      console.error("Error fetching course:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollment = async () => {
    if (!user || !id) return;
    
    try {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", user.id)
        .eq("course_id", id)
        .single();

      if (data) setIsEnrolled(true);
    } catch (error) {
      // Not enrolled, which is fine
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to enroll in courses",
        variant: "destructive",
      });
      return;
    }

    setEnrolling(true);
    try {
      const { error } = await supabase
        .from("enrollments")
        .insert({
          user_id: user.id,
          course_id: id,
        });

      if (error) throw error;

      setIsEnrolled(true);
      toast({
        title: "Enrolled successfully!",
        description: "You can now access this course from your dashboard",
      });
    } catch (error: any) {
      toast({
        title: "Enrollment failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
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

  if (!course) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <p>Course not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        <Link to="/courses">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Courses
          </Button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="gradient-card shadow-medium overflow-hidden mb-6">
              <div className="aspect-video">
                <iframe
                  src={course.video_url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </Card>

            <h1 className="text-4xl md:text-5xl mb-4">{course.title}</h1>
            <p className="text-lg text-muted-foreground whitespace-pre-line">{course.description}</p>
          </div>

          <div className="lg:col-span-1">
            <Card className="gradient-card shadow-soft p-6 sticky top-24">
              <div className="mb-6">
                <img
                  src={course.image_url || "/placeholder.svg"}
                  alt={course.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
              
              {user ? (
                isMember ? (
                  isEnrolled ? (
                    <Button className="w-full" disabled>
                      <CheckCircle className="mr-2 w-4 h-4" />
                      Enrolled
                    </Button>
                  ) : (
                    <Button 
                      className="w-full shadow-glow" 
                      onClick={handleEnroll}
                      disabled={enrolling}
                    >
                      {enrolling ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        "Enroll Now"
                      )}
                    </Button>
                  )
                ) : (
                  <Link to="/membership">
                    <Button className="w-full shadow-glow">
                      Become a Member to Enroll
                    </Button>
                  </Link>
                )
              ) : (
                <Link to="/membership">
                  <Button className="w-full shadow-glow">
                    Become a Member
                  </Button>
                </Link>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
