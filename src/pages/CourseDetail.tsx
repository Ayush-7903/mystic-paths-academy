import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, ArrowLeft, BookOpen, Lock, Award, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

interface Course {
  id: string;
  title: string;
  description: string;
  video_url: string;
  image_url: string | null;
  price_cents: number;
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  order_number: number;
  section: string | null;
  completed: boolean;
}

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [progress, setProgress] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const { toast } = useToast();

  // Check for payment success
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    
    if (paymentStatus === "success" && sessionId && user && id) {
      verifyPurchase(sessionId);
    } else if (paymentStatus === "cancelled") {
      toast({
        title: "Payment cancelled",
        description: "Your payment was cancelled. You can try again anytime.",
        variant: "destructive",
      });
      // Clear the URL params
      navigate(`/courses/${id}`, { replace: true });
    }
  }, [searchParams, user, id]);

  const verifyPurchase = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-purchase', {
        body: { sessionId, courseId: id },
      });

      if (error) throw error;

      if (data.success) {
        setHasPurchased(true);
        toast({
          title: "Purchase successful!",
          description: "You now have access to this course.",
        });
        // Refresh data
        fetchLessons();
      }
      
      // Clear the URL params
      navigate(`/courses/${id}`, { replace: true });
    } catch (error) {
      console.error("Error verifying purchase:", error);
      // Clear the URL params
      navigate(`/courses/${id}`, { replace: true });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (id) {
      fetchCourse();
      fetchLessons();
      if (user) {
        checkPurchase();
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

  const fetchLessons = async () => {
    try {
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", id)
        .order("order_number");

      if (lessonsError) throw lessonsError;

      let lessonsWithCompletion: Lesson[] = [];

      if (user) {
        const { data: completionsData } = await supabase
          .from("lesson_completions")
          .select("lesson_id")
          .eq("user_id", user.id);

        const completedLessonIds = new Set(completionsData?.map(c => c.lesson_id) || []);
        lessonsWithCompletion = (lessonsData || []).map(lesson => ({
          ...lesson,
          completed: completedLessonIds.has(lesson.id)
        }));

        const completedCount = completedLessonIds.size;
        const totalLessons = lessonsData?.length || 0;
        const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
        setProgress(progressPercent);
      } else {
        lessonsWithCompletion = (lessonsData || []).map(lesson => ({
          ...lesson,
          completed: false
        }));
      }

      setLessons(lessonsWithCompletion);
      if (lessonsWithCompletion.length > 0 && !selectedLesson) {
        setSelectedLesson(lessonsWithCompletion[0]);
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
    }
  };

  const checkPurchase = async () => {
    if (!user || !id) return;
    
    try {
      // Check subscription status
      const { data: subData } = await supabase.functions.invoke("check-subscription");
      if (subData?.subscribed) {
        setHasPurchased(true);
        return;
      }
      
      // Fallback: check legacy purchases
      const { data } = await supabase
        .from("purchases")
        .select("*")
        .eq("user_id", user.id)
        .eq("course_id", id)
        .eq("status", "completed")
        .single();

      if (data) setHasPurchased(true);
    } catch {
      // Not purchased/subscribed
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!course) return;

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          courseId: course.id,
          priceInCents: course.price_cents,
          courseTitle: course.title,
        },
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to start checkout";
      toast({
        title: "Checkout failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const toggleLessonCompletion = async (lessonId: string, currentlyCompleted: boolean) => {
    if (!user || !hasPurchased) return;

    try {
      if (currentlyCompleted) {
        await supabase
          .from("lesson_completions")
          .delete()
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId);
      } else {
        await supabase
          .from("lesson_completions")
          .insert({
            user_id: user.id,
            lesson_id: lessonId,
          });
      }

      fetchLessons();
      toast({
        title: currentlyCompleted ? "Lesson unmarked" : "Lesson completed!",
        description: currentlyCompleted ? "Progress updated" : "Great work! Keep going!",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error updating progress";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const groupedLessons = lessons.reduce((acc, lesson) => {
    const section = lesson.section || "Other";
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(lesson);
    return acc;
  }, {} as Record<string, Lesson[]>);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
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
          <div className="lg:col-span-2 space-y-8">
            {/* Video Section */}
            <Card className="gradient-card shadow-medium overflow-hidden border-primary/20">
              <div className="aspect-video">
                <iframe
                  src={course.video_url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </Card>

            {/* Course Header */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                {course.title}
              </h1>
              <p className="text-lg text-muted-foreground whitespace-pre-line leading-relaxed">
                {course.description}
              </p>
            </div>

            {/* Progress Section */}
            {user && hasPurchased && (
              <Card className="gradient-card shadow-soft p-6 border-primary/20">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      Your Progress
                    </h3>
                    <span className="text-2xl font-bold text-primary">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <p className="text-sm text-muted-foreground">
                    {lessons.filter(l => l.completed).length} of {lessons.length} lessons completed
                  </p>
                </div>
              </Card>
            )}

            {/* Lessons Section */}
            {hasPurchased && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <BookOpen className="w-7 h-7 text-primary" />
                  Course Content
                </h2>
                
                {Object.entries(groupedLessons).map(([section, sectionLessons]) => (
                  <Card key={section} className="gradient-card shadow-soft border-primary/10 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b border-primary/20">
                      <h3 className="text-xl font-bold text-primary">{section}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {sectionLessons.filter(l => l.completed).length} of {sectionLessons.length} completed
                      </p>
                    </div>
                    <div className="divide-y divide-border/50">
                      {sectionLessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className={`p-6 transition-all duration-300 hover:bg-primary/5 cursor-pointer ${
                            selectedLesson?.id === lesson.id ? 'bg-primary/10 border-l-4 border-primary' : ''
                          }`}
                          onClick={() => setSelectedLesson(lesson)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                {lesson.completed ? (
                                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                                )}
                                <h4 className="font-semibold text-lg">{lesson.title}</h4>
                              </div>
                              {selectedLesson?.id === lesson.id && (
                                <div className="pl-8 space-y-4 mt-4">
                                  <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line leading-relaxed">
                                    {lesson.content}
                                  </div>
                                  {user && (
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleLessonCompletion(lesson.id, lesson.completed);
                                      }}
                                      variant={lesson.completed ? "outline" : "default"}
                                      className="shadow-glow"
                                    >
                                      {lesson.completed ? (
                                        <>
                                          <CheckCircle className="w-4 h-4 mr-2" />
                                          Completed
                                        </>
                                      ) : (
                                        "Mark as Completed"
                                      )}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Preview for non-purchased */}
            {!hasPurchased && lessons.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <BookOpen className="w-7 h-7 text-primary" />
                  Course Content Preview
                </h2>
                <Card className="gradient-card shadow-soft border-primary/10 overflow-hidden">
                  <div className="divide-y divide-border/50">
                    {lessons.slice(0, 3).map((lesson, index) => (
                      <div key={lesson.id} className="p-6">
                        <div className="flex items-center gap-3">
                          <Lock className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                          <h4 className="font-semibold text-lg text-muted-foreground">{lesson.title}</h4>
                        </div>
                      </div>
                    ))}
                    {lessons.length > 3 && (
                      <div className="p-6 text-center text-muted-foreground">
                        + {lessons.length - 3} more lessons
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="gradient-card shadow-elegant p-6 sticky top-24 border-primary/20">
              <div className="space-y-6">
                {/* Course Image */}
                <div className="relative group overflow-hidden rounded-lg">
                  <img
                    src={course.image_url || "/placeholder.svg"}
                    alt={course.title}
                    className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Access Status */}
                <div className="text-center">
                  {hasPurchased ? (
                    <>
                      <div className="text-2xl font-bold text-primary">Full Access</div>
                      <p className="text-sm text-muted-foreground mt-1">Included in your membership</p>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-primary">Members Only</div>
                      <p className="text-sm text-muted-foreground mt-1">Subscribe to unlock</p>
                    </>
                  )}
                </div>

                {/* Course Stats */}
                {hasPurchased && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="text-2xl font-bold text-primary">{lessons.length}</div>
                      <div className="text-xs text-muted-foreground">Lessons</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="text-2xl font-bold text-primary">{progress}%</div>
                      <div className="text-xs text-muted-foreground">Complete</div>
                    </div>
                  </div>
                )}
                
                {/* Purchase/Access Button */}
                {user ? (
                  hasPurchased ? (
                    <Button className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/40" disabled>
                      <CheckCircle className="mr-2 w-4 h-4" />
                      Purchased
                    </Button>
                  ) : (
                    <Button 
                      className="w-full shadow-glow hover:shadow-glow-lg transition-all duration-300" 
                      onClick={() => navigate("/membership")}
                      size="lg"
                    >
                      <Crown className="mr-2 w-4 h-4" />
                      Become a Guardian
                    </Button>
                  )
                ) : (
                  <div className="space-y-3">
                    <Button 
                      className="w-full shadow-glow hover:shadow-glow-lg transition-all duration-300"
                      onClick={() => navigate("/signup")}
                      size="lg"
                    >
                      <Crown className="mr-2 w-4 h-4" />
                      Sign Up to Subscribe
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-primary"
                        onClick={() => navigate("/auth")}
                      >
                        Login
                      </Button>
                    </p>
                  </div>
                )}

                {/* Additional Info */}
                {hasPurchased && (
                  <div className="pt-4 border-t border-border/50 space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      {lessons.filter(l => l.completed).length} lessons completed
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Award className="w-4 h-4 text-primary" />
                      {Object.keys(groupedLessons).length} sections to explore
                    </p>
                  </div>
                )}

                {/* Features for non-purchased */}
                {!hasPurchased && (
                  <div className="pt-4 border-t border-border/50 space-y-2">
                    <p className="text-sm font-medium">This course includes:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        {lessons.length} lessons
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        Full course access
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        Progress tracking
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
