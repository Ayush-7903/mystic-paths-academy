import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Course {
  id: string;
  title: string;
  description: string;
  video_url: string;
  image_url: string | null;
}

const Admin = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    image_url: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .single();
    
    if (!roleData) {
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    fetchCourses();
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.video_url) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editing) {
        const { error } = await supabase
          .from("courses")
          .update(formData)
          .eq("id", editing);

        if (error) throw error;

        toast({
          title: "Course updated!",
          description: "The course has been successfully updated",
        });
      } else {
        const { error } = await supabase
          .from("courses")
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Course created!",
          description: "The new course has been added",
        });
      }

      setFormData({ title: "", description: "", video_url: "", image_url: "" });
      setEditing(null);
      fetchCourses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (course: Course) => {
    setEditing(course.id);
    setFormData({
      title: course.title,
      description: course.description,
      video_url: course.video_url,
      image_url: course.image_url || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;

    try {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Course deleted",
        description: "The course has been removed",
      });
      fetchCourses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
          <h1 className="text-5xl md:text-6xl mb-4">
            Admin Dashboard
          </h1>
          <p className="text-xl text-muted-foreground">
            Manage courses and content
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <Card className="gradient-card shadow-medium mb-12">
          <CardHeader>
            <CardTitle>
              {editing ? "Edit Course" : "Add New Course"}
            </CardTitle>
            <CardDescription>
              {editing ? "Update the course details" : "Create a new course for students"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video_url">Video URL (YouTube embed) *</Label>
                <Input
                  id="video_url"
                  placeholder="https://www.youtube.com/embed/..."
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  placeholder="/images/course.jpg"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit">
                  {editing ? (
                    <>
                      <Pencil className="mr-2 w-4 h-4" />
                      Update Course
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 w-4 h-4" />
                      Add Course
                    </>
                  )}
                </Button>
                {editing && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditing(null);
                      setFormData({ title: "", description: "", video_url: "", image_url: "" });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <h2 className="text-3xl mb-6">Manage Courses</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="gradient-card shadow-soft">
              <div className="relative h-48 overflow-hidden rounded-t-lg">
                <img
                  src={course.image_url || "/placeholder.svg"}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader>
                <CardTitle className="text-xl">{course.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {course.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEdit(course)}
                  className="flex-1"
                >
                  <Pencil className="mr-2 w-4 h-4" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleDelete(course.id)}
                  className="flex-1"
                >
                  <Trash2 className="mr-2 w-4 h-4" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Admin;
