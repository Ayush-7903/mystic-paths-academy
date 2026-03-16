import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  description: string;
  video_url: string;
  image_url: string | null;
  instructor_name: string | null;
  category: string | null;
}

interface AdminCourseFormProps {
  course: Course | null;
  onSaved: () => void;
  onCancel: () => void;
}

export const AdminCourseForm = ({ course, onSaved, onCancel }: AdminCourseFormProps) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    image_url: "",
    instructor_name: "",
    category: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title,
        description: course.description,
        video_url: course.video_url,
        image_url: course.image_url || "",
        instructor_name: course.instructor_name || "",
        category: course.category || "",
      });
    } else {
      setFormData({ title: "", description: "", video_url: "", image_url: "", instructor_name: "", category: "" });
    }
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.video_url) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        video_url: formData.video_url,
        image_url: formData.image_url || null,
        instructor_name: formData.instructor_name || null,
        category: formData.category || null,
      };

      if (course) {
        const { error } = await supabase.from("courses").update(payload).eq("id", course.id);
        if (error) throw error;
        toast({ title: "Course updated!", description: "The course has been successfully updated" });
      } else {
        const { error } = await supabase.from("courses").insert([payload]);
        if (error) throw error;
        toast({ title: "Course created!", description: "The new course has been added" });
      }
      onSaved();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Card className="gradient-card shadow-medium">
      <CardHeader>
        <CardTitle>{course ? "Edit Course" : "Add New Course"}</CardTitle>
        <CardDescription>{course ? "Update the course details" : "Create a new course for students"}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" placeholder="e.g. Spirituality, Meditation" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} required />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="video_url">Video URL (YouTube embed) *</Label>
              <Input id="video_url" placeholder="https://www.youtube.com/embed/..." value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructor_name">Instructor Name</Label>
              <Input id="instructor_name" placeholder="Instructor name" value={formData.instructor_name} onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input id="image_url" placeholder="/images/course.jpg or https://..." value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} />
          </div>

          <div className="flex gap-4">
            <Button type="submit">
              {course ? <><Pencil className="mr-2 w-4 h-4" /> Update Course</> : <><Plus className="mr-2 w-4 h-4" /> Add Course</>}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
