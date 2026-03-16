import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Lesson {
  id: string;
  title: string;
  content: string;
  description: string;
  video_url: string | null;
  pdf_url: string | null;
  order_number: number;
}

interface AdminChapterFormProps {
  courseId: string;
  moduleId: string;
  lessonId: string | null;
  existingLessons: Lesson[];
  onSaved: () => void;
  onCancel: () => void;
}

export const AdminChapterForm = ({ courseId, moduleId, lessonId, existingLessons, onSaved, onCancel }: AdminChapterFormProps) => {
  const [form, setForm] = useState({ title: "", description: "", content: "", video_url: "", pdf_url: "" });
  const { toast } = useToast();

  useEffect(() => {
    if (lessonId) {
      const lesson = existingLessons.find(l => l.id === lessonId);
      if (lesson) {
        setForm({
          title: lesson.title,
          description: lesson.description || "",
          content: lesson.content,
          video_url: lesson.video_url || "",
          pdf_url: lesson.pdf_url || "",
        });
      }
    }
  }, [lessonId, existingLessons]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }

    try {
      if (lessonId) {
        const { error } = await supabase.from("lessons").update({
          title: form.title,
          description: form.description,
          content: form.content,
          video_url: form.video_url || null,
          pdf_url: form.pdf_url || null,
        }).eq("id", lessonId);
        if (error) throw error;
        toast({ title: "Chapter updated" });
      } else {
        const nextOrder = existingLessons.length > 0 ? Math.max(...existingLessons.map(l => l.order_number)) + 1 : 1;
        const { error } = await supabase.from("lessons").insert([{
          course_id: courseId,
          module_id: moduleId,
          title: form.title,
          description: form.description,
          content: form.content,
          video_url: form.video_url || null,
          pdf_url: form.pdf_url || null,
          order_number: nextOrder,
          section: null,
        }]);
        if (error) throw error;
        toast({ title: "Chapter added" });
      }
      onSaved();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{lessonId ? "Edit Chapter" : "Add Chapter"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Chapter Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label>Video URL</Label>
              <Input placeholder="https://youtube.com/embed/..." value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Content *</Label>
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} required />
          </div>
          <div className="space-y-1">
            <Label>PDF Resource URL</Label>
            <Input placeholder="https://..." value={form.pdf_url} onChange={(e) => setForm({ ...form, pdf_url: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">{lessonId ? "Update" : "Add"} Chapter</Button>
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
