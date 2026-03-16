import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, BookOpen, Layers, FileText, HelpCircle, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminCourseForm } from "@/components/admin/AdminCourseForm";
import { AdminModuleManager } from "@/components/admin/AdminModuleManager";
import { AdminQuizManager } from "@/components/admin/AdminQuizManager";

interface Course {
  id: string;
  title: string;
  description: string;
  video_url: string;
  image_url: string | null;
  instructor_name: string | null;
  category: string | null;
}

interface Stats {
  totalCourses: number;
  totalModules: number;
  totalChapters: number;
  totalQuizzes: number;
}

const Admin = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats>({ totalCourses: 0, totalModules: 0, totalChapters: 0, totalQuizzes: 0 });
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();
    
    if (!roleData) { navigate("/dashboard"); return; }
    setIsAdmin(true);
    fetchData();
  };

  const fetchData = async () => {
    try {
      const [coursesRes, modulesRes, lessonsRes, quizzesRes] = await Promise.all([
        supabase.from("courses").select("*").order("created_at", { ascending: true }),
        supabase.from("modules").select("id"),
        supabase.from("lessons").select("id"),
        supabase.from("quizzes").select("id"),
      ]);

      setCourses(coursesRes.data || []);
      setStats({
        totalCourses: coursesRes.data?.length || 0,
        totalModules: modulesRes.data?.length || 0,
        totalChapters: lessonsRes.data?.length || 0,
        totalQuizzes: quizzesRes.data?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Are you sure? This will delete all modules, chapters, and quizzes in this course.")) return;
    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Course deleted", description: "The course and all its content have been removed" });
      fetchData();
      if (selectedCourse?.id === id) setSelectedCourse(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading || !isAdmin) {
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
          <Link to="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-5xl md:text-6xl mb-4">Admin Dashboard</h1>
          <p className="text-xl text-muted-foreground">Manage courses, modules, chapters, and quizzes</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="gradient-card border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Courses</p>
                  <p className="text-3xl font-bold text-primary">{stats.totalCourses}</p>
                </div>
                <BookOpen className="w-10 h-10 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="gradient-card border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Modules</p>
                  <p className="text-3xl font-bold text-primary">{stats.totalModules}</p>
                </div>
                <Layers className="w-10 h-10 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="gradient-card border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chapters</p>
                  <p className="text-3xl font-bold text-primary">{stats.totalChapters}</p>
                </div>
                <FileText className="w-10 h-10 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="gradient-card border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quizzes</p>
                  <p className="text-3xl font-bold text-primary">{stats.totalQuizzes}</p>
                </div>
                <HelpCircle className="w-10 h-10 text-primary/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Courses Overview</TabsTrigger>
            <TabsTrigger value="create">Add Course</TabsTrigger>
            {selectedCourse && (
              <>
                <TabsTrigger value="modules">Modules & Chapters</TabsTrigger>
                <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="overview">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">All Courses</h2>
              <Button onClick={() => setActiveTab("create")}>
                <Plus className="mr-2 w-4 h-4" /> Add Course
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card key={course.id} className="gradient-card shadow-soft overflow-hidden">
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    <img
                      src={course.image_url || "/placeholder.svg"}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    {course.category && (
                      <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground">
                        {course.category}
                      </Badge>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                    {course.instructor_name && (
                      <p className="text-sm text-muted-foreground">by {course.instructor_name}</p>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => { setSelectedCourse(course); setActiveTab("modules"); }}
                      className="w-full"
                    >
                      <Layers className="mr-2 w-4 h-4" /> Manage Content
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedCourse(course); setActiveTab("create"); }}
                        className="flex-1"
                      >
                        <Pencil className="mr-2 w-4 h-4" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCourse(course.id)}
                        className="flex-1"
                      >
                        <Trash2 className="mr-2 w-4 h-4" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="create">
            <AdminCourseForm
              course={selectedCourse}
              onSaved={() => {
                fetchData();
                setSelectedCourse(null);
                setActiveTab("overview");
              }}
              onCancel={() => {
                setSelectedCourse(null);
                setActiveTab("overview");
              }}
            />
          </TabsContent>

          {selectedCourse && (
            <TabsContent value="modules">
              <div className="mb-4">
                <h2 className="text-3xl font-bold">{selectedCourse.title}</h2>
                <p className="text-muted-foreground">Manage modules and chapters</p>
              </div>
              <AdminModuleManager courseId={selectedCourse.id} />
            </TabsContent>
          )}

          {selectedCourse && (
            <TabsContent value="quizzes">
              <div className="mb-4">
                <h2 className="text-3xl font-bold">{selectedCourse.title}</h2>
                <p className="text-muted-foreground">Manage quizzes</p>
              </div>
              <AdminQuizManager courseId={selectedCourse.id} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
