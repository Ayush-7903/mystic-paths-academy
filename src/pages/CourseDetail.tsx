import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, ArrowLeft, BookOpen, Lock, Award, Crown, Layers, FileText, HelpCircle, ChevronDown, ChevronRight, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StudentQuiz } from "@/components/course/StudentQuiz";

interface Course {
  id: string;
  title: string;
  description: string;
  video_url: string;
  image_url: string | null;
  price_cents: number;
  instructor_name?: string | null;
  category?: string | null;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_number: number;
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  description: string;
  video_url: string | null;
  pdf_url: string | null;
  order_number: number;
  section: string | null;
  module_id: string | null;
  completed: boolean;
}

interface Quiz {
  id: string;
  title: string;
  quiz_type: string;
  lesson_id: string | null;
  module_id: string | null;
}

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  // Check for payment success
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    if (paymentStatus === "success" && sessionId && user && id) {
      verifyPurchase(sessionId);
    } else if (paymentStatus === "cancelled") {
      toast({ title: "Payment cancelled", description: "Your payment was cancelled. You can try again anytime.", variant: "destructive" });
      navigate(`/courses/${id}`, { replace: true });
    }
  }, [searchParams, user, id]);

  const verifyPurchase = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-purchase', { body: { sessionId, courseId: id } });
      if (error) throw error;
      if (data.success) {
        setHasPurchased(true);
        toast({ title: "Purchase successful!", description: "You now have access to this course." });
        fetchLessons();
      }
      navigate(`/courses/${id}`, { replace: true });
    } catch (error) {
      console.error("Error verifying purchase:", error);
      navigate(`/courses/${id}`, { replace: true });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (id) {
      fetchCourse();
      fetchModules();
      fetchLessons();
      fetchQuizzes();
      if (user) checkPurchase();
    }
  }, [id, user]);

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
      if (error) throw error;
      setCourse(data);
    } catch (error) {
      console.error("Error fetching course:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    const { data } = await supabase.from("modules").select("*").eq("course_id", id).order("order_number");
    setModules(data || []);
    if (data && data.length > 0) {
      setExpandedModules(new Set([data[0].id]));
    }
  };

  const fetchQuizzes = async () => {
    // Fetch quizzes linked to modules or lessons of this course
    const [modsRes, lessonsRes] = await Promise.all([
      supabase.from("modules").select("id").eq("course_id", id!),
      supabase.from("lessons").select("id").eq("course_id", id!),
    ]);
    const modIds = modsRes.data?.map(m => m.id) || [];
    const lessonIds = lessonsRes.data?.map(l => l.id) || [];
    
    if (modIds.length === 0 && lessonIds.length === 0) {
      setQuizzes([]);
      return;
    }

    let query = supabase.from("quizzes").select("*");
    const conditions: string[] = [];
    if (modIds.length > 0) conditions.push(`module_id.in.(${modIds.join(",")})`);
    if (lessonIds.length > 0) conditions.push(`lesson_id.in.(${lessonIds.join(",")})`);
    
    const { data } = await query.or(conditions.join(","));
    setQuizzes(data || []);
  };

  const fetchLessons = async () => {
    try {
      const { data: lessonsData, error } = await supabase.from("lessons").select("*").eq("course_id", id).order("order_number");
      if (error) throw error;

      let lessonsWithCompletion: Lesson[] = [];
      if (user) {
        const { data: completionsData } = await supabase.from("lesson_completions").select("lesson_id").eq("user_id", user.id);
        const completedIds = new Set(completionsData?.map(c => c.lesson_id) || []);
        lessonsWithCompletion = (lessonsData || []).map(lesson => ({ ...lesson, completed: completedIds.has(lesson.id) }));
        const completed = lessonsWithCompletion.filter(l => l.completed).length;
        const total = lessonsWithCompletion.length;
        setProgress(total > 0 ? Math.round((completed / total) * 100) : 0);
      } else {
        lessonsWithCompletion = (lessonsData || []).map(lesson => ({ ...lesson, completed: false }));
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
      const { data: paypalData } = await supabase.functions.invoke("paypal-check-subscription");
      if (paypalData?.subscribed) { setHasPurchased(true); return; }
      const { data: subData } = await supabase.functions.invoke("check-subscription");
      if (subData?.subscribed) { setHasPurchased(true); return; }
      const { data } = await supabase.from("purchases").select("*").eq("user_id", user.id).eq("course_id", id).eq("status", "completed").single();
      if (data) setHasPurchased(true);
    } catch { /* Not purchased */ }
  };

  const toggleLessonCompletion = async (lessonId: string, currentlyCompleted: boolean) => {
    if (!user || !hasPurchased) return;
    try {
      if (currentlyCompleted) {
        await supabase.from("lesson_completions").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
      } else {
        await supabase.from("lesson_completions").insert({ user_id: user.id, lesson_id: lessonId });
      }
      fetchLessons();
      toast({
        title: currentlyCompleted ? "Lesson unmarked" : "Lesson completed!",
        description: currentlyCompleted ? "Progress updated" : "Great work! Keep going!",
      });

      // Check if chapter quiz is available
      if (!currentlyCompleted) {
        const chapterQuiz = quizzes.find(q => q.quiz_type === "chapter" && q.lesson_id === lessonId);
        if (chapterQuiz) {
          setActiveQuiz(chapterQuiz);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error updating progress";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId); else next.add(moduleId);
      return next;
    });
  };

  // Check if all lessons in a module are completed
  const isModuleComplete = (moduleId: string) => {
    const moduleLessons = lessons.filter(l => l.module_id === moduleId);
    return moduleLessons.length > 0 && moduleLessons.every(l => l.completed);
  };

  // Group lessons by module
  const getLessonsForModule = (moduleId: string) => lessons.filter(l => l.module_id === moduleId);
  
  // Get legacy lessons (no module)
  const legacyLessons = lessons.filter(l => !l.module_id);
  const groupedLegacyLessons = legacyLessons.reduce((acc, lesson) => {
    const section = lesson.section || "Other";
    if (!acc[section]) acc[section] = [];
    acc[section].push(lesson);
    return acc;
  }, {} as Record<string, Lesson[]>);

  const hasModules = modules.length > 0;

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
        <div className="container mx-auto px-4 pt-24"><p>Course not found</p></div>
      </div>
    );
  }

  // Show quiz overlay
  if (activeQuiz && user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-16 max-w-3xl">
          <Button variant="ghost" className="mb-6" onClick={() => setActiveQuiz(null)}>
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Course
          </Button>
          <StudentQuiz
            quizId={activeQuiz.id}
            quizTitle={activeQuiz.title}
            userId={user.id}
            onComplete={() => {
              setActiveQuiz(null);
              // If it was a chapter quiz, check for module quiz
              if (activeQuiz.quiz_type === "chapter" && activeQuiz.lesson_id) {
                const lesson = lessons.find(l => l.id === activeQuiz.lesson_id);
                if (lesson?.module_id && isModuleComplete(lesson.module_id)) {
                  const moduleQuiz = quizzes.find(q => q.quiz_type === "module" && q.module_id === lesson.module_id);
                  if (moduleQuiz) {
                    setTimeout(() => setActiveQuiz(moduleQuiz), 500);
                  }
                }
              }
            }}
            onBack={() => setActiveQuiz(null)}
          />
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
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Courses
          </Button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Video Section */}
            <Card className="gradient-card shadow-medium overflow-hidden border-primary/20">
              <div className="aspect-video">
                {selectedLesson?.video_url ? (
                  <iframe src={selectedLesson.video_url} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                ) : (
                  <iframe src={course.video_url} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                )}
              </div>
            </Card>

            {/* Course Header */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                {course.title}
              </h1>
              {course.instructor_name && (
                <p className="text-muted-foreground">by {course.instructor_name}</p>
              )}
              <p className="text-lg text-muted-foreground whitespace-pre-line leading-relaxed">{course.description}</p>
            </div>

            {/* Selected Lesson Content */}
            {selectedLesson && hasPurchased && (
              <Card className="gradient-card shadow-soft p-6 border-primary/20 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">{selectedLesson.title}</h3>
                  {user && (
                    <Button
                      onClick={() => toggleLessonCompletion(selectedLesson.id, selectedLesson.completed)}
                      variant={selectedLesson.completed ? "outline" : "default"}
                      className="shadow-glow"
                    >
                      {selectedLesson.completed ? <><CheckCircle className="w-4 h-4 mr-2" /> Completed</> : "Mark as Completed"}
                    </Button>
                  )}
                </div>
                {selectedLesson.description && (
                  <p className="text-muted-foreground">{selectedLesson.description}</p>
                )}
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line leading-relaxed">
                  {selectedLesson.content}
                </div>
                {selectedLesson.pdf_url && (
                  <a href={selectedLesson.pdf_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" /> Download PDF Resource
                    </Button>
                  </a>
                )}
                {/* Chapter Quiz Button */}
                {(() => {
                  const chapterQuiz = quizzes.find(q => q.quiz_type === "chapter" && q.lesson_id === selectedLesson.id);
                  if (chapterQuiz && selectedLesson.completed) {
                    return (
                      <Button onClick={() => setActiveQuiz(chapterQuiz)} variant="outline" className="border-primary/30">
                        <HelpCircle className="w-4 h-4 mr-2" /> Take Chapter Quiz
                      </Button>
                    );
                  }
                  return null;
                })()}
              </Card>
            )}

            {/* Progress Section */}
            {user && hasPurchased && (
              <Card className="gradient-card shadow-soft p-6 border-primary/20">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" /> Your Progress
                    </h3>
                    <span className="text-2xl font-bold text-primary">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <p className="text-sm text-muted-foreground">
                    {lessons.filter(l => l.completed).length} of {lessons.length} chapters completed
                  </p>
                </div>
              </Card>
            )}

            {/* Course Content - Modules */}
            {hasPurchased && hasModules && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <BookOpen className="w-7 h-7 text-primary" /> Course Content
                </h2>
                {modules.map((mod) => {
                  const moduleLessons = getLessonsForModule(mod.id);
                  const completedCount = moduleLessons.filter(l => l.completed).length;
                  const moduleComplete = isModuleComplete(mod.id);
                  const moduleQuiz = quizzes.find(q => q.quiz_type === "module" && q.module_id === mod.id);

                  return (
                    <Card key={mod.id} className="gradient-card shadow-soft border-primary/10 overflow-hidden">
                      <Collapsible open={expandedModules.has(mod.id)} onOpenChange={() => toggleModule(mod.id)}>
                        <CollapsibleTrigger asChild>
                          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b border-primary/20 cursor-pointer hover:from-primary/15 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {expandedModules.has(mod.id) ? <ChevronDown className="w-5 h-5 text-primary" /> : <ChevronRight className="w-5 h-5 text-primary" />}
                                <Layers className="w-5 h-5 text-primary" />
                                <div>
                                  <h3 className="text-xl font-bold text-primary">{mod.title}</h3>
                                  {mod.description && <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{completedCount}/{moduleLessons.length}</span>
                                {moduleComplete && <Badge className="bg-primary/20 text-primary border-primary/30">Complete</Badge>}
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="divide-y divide-border/50">
                            {moduleLessons.map((lesson) => (
                              <div
                                key={lesson.id}
                                className={`p-6 transition-all duration-300 hover:bg-primary/5 cursor-pointer ${
                                  selectedLesson?.id === lesson.id ? 'bg-primary/10 border-l-4 border-primary' : ''
                                }`}
                                onClick={() => setSelectedLesson(lesson)}
                              >
                                <div className="flex items-center gap-3">
                                  {lesson.completed ? (
                                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                                  )}
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-lg">{lesson.title}</h4>
                                    {lesson.description && <p className="text-sm text-muted-foreground">{lesson.description}</p>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {lesson.video_url && <Badge variant="secondary" className="text-xs">Video</Badge>}
                                    {lesson.pdf_url && <Badge variant="secondary" className="text-xs">PDF</Badge>}
                                    {quizzes.some(q => q.quiz_type === "chapter" && q.lesson_id === lesson.id) && (
                                      <Badge variant="secondary" className="text-xs">Quiz</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Module Quiz */}
                          {moduleQuiz && moduleComplete && (
                            <div className="p-4 bg-primary/5 border-t border-primary/20">
                              <Button onClick={() => setActiveQuiz(moduleQuiz)} className="w-full shadow-glow">
                                <HelpCircle className="w-4 h-4 mr-2" /> Take Module Final Quiz: {moduleQuiz.title}
                              </Button>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Legacy Content (sections-based, no modules) */}
            {hasPurchased && !hasModules && legacyLessons.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <BookOpen className="w-7 h-7 text-primary" /> Course Content
                </h2>
                {Object.entries(groupedLegacyLessons).map(([section, sectionLessons]) => (
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
                          <div className="flex items-center gap-3">
                            {lesson.completed ? (
                              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                            )}
                            <h4 className="font-semibold text-lg">{lesson.title}</h4>
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
                  <BookOpen className="w-7 h-7 text-primary" /> Course Content Preview
                </h2>
                {hasModules ? (
                  modules.map((mod) => {
                    const moduleLessons = getLessonsForModule(mod.id);
                    return (
                      <Card key={mod.id} className="gradient-card shadow-soft border-primary/10 overflow-hidden">
                        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b border-primary/20">
                          <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                            <Lock className="w-4 h-4" /> {mod.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">{moduleLessons.length} chapters</p>
                        </div>
                        <div className="divide-y divide-border/50">
                          {moduleLessons.map((lesson) => (
                            <div key={lesson.id} className="p-4">
                              <div className="flex items-center gap-3">
                                <Lock className="w-4 h-4 text-muted-foreground/50" />
                                <span className="text-muted-foreground">{lesson.title}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="gradient-card shadow-soft border-primary/10 overflow-hidden">
                    <div className="divide-y divide-border/50">
                      {lessons.slice(0, 3).map((lesson) => (
                        <div key={lesson.id} className="p-6">
                          <div className="flex items-center gap-3">
                            <Lock className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                            <h4 className="font-semibold text-lg text-muted-foreground">{lesson.title}</h4>
                          </div>
                        </div>
                      ))}
                      {lessons.length > 3 && (
                        <div className="p-6 text-center text-muted-foreground">+ {lessons.length - 3} more chapters</div>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="gradient-card shadow-elegant p-6 sticky top-24 border-primary/20">
              <div className="space-y-6">
                <div className="relative group overflow-hidden rounded-lg">
                  <img src={course.image_url || "/placeholder.svg"} alt={course.title} className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

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

                {hasPurchased && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="text-2xl font-bold text-primary">{lessons.length}</div>
                      <div className="text-xs text-muted-foreground">Chapters</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="text-2xl font-bold text-primary">{progress}%</div>
                      <div className="text-xs text-muted-foreground">Complete</div>
                    </div>
                  </div>
                )}

                {user ? (
                  hasPurchased ? (
                    <Button className="w-full bg-primary/20 hover:bg-primary/30 border border-primary/40" disabled>
                      <CheckCircle className="mr-2 w-4 h-4" /> Purchased
                    </Button>
                  ) : (
                    <Button className="w-full shadow-glow" onClick={() => navigate("/membership")} size="lg">
                      <Crown className="mr-2 w-4 h-4" /> Become a Guardian
                    </Button>
                  )
                ) : (
                  <div className="space-y-3">
                    <Button className="w-full shadow-glow" onClick={() => navigate("/signup")} size="lg">
                      <Crown className="mr-2 w-4 h-4" /> Sign Up to Subscribe
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Button variant="link" className="p-0 h-auto text-primary" onClick={() => navigate("/auth")}>Login</Button>
                    </p>
                  </div>
                )}

                {hasPurchased && (
                  <div className="pt-4 border-t border-border/50 space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" /> {lessons.filter(l => l.completed).length} chapters completed
                    </p>
                    {hasModules && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" /> {modules.length} modules
                      </p>
                    )}
                    {quizzes.length > 0 && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-primary" /> {quizzes.length} quizzes
                      </p>
                    )}
                  </div>
                )}

                {!hasPurchased && (
                  <div className="pt-4 border-t border-border/50 space-y-2">
                    <p className="text-sm font-medium">This course includes:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> {lessons.length} chapters</li>
                      {hasModules && <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> {modules.length} modules</li>}
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Progress tracking</li>
                      {quizzes.length > 0 && <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> Interactive quizzes</li>}
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
