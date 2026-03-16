import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, FileText, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AdminChapterForm } from "./AdminChapterForm";

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
  module_id: string | null;
}

interface AdminModuleManagerProps {
  courseId: string;
}

export const AdminModuleManager = ({ courseId }: AdminModuleManagerProps) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [addingChapterToModule, setAddingChapterToModule] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: "", description: "" });
  const { toast } = useToast();

  useEffect(() => { fetchModules(); }, [courseId]);

  const fetchModules = async () => {
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("course_id", courseId)
      .order("order_number");
    if (error) { console.error(error); return; }
    setModules(data || []);
    // Fetch lessons for all modules
    for (const mod of data || []) {
      fetchLessons(mod.id);
    }
  };

  const fetchLessons = async (moduleId: string) => {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("order_number");
    if (error) { console.error(error); return; }
    setLessons(prev => ({ ...prev, [moduleId]: data || [] }));
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleForm.title) { toast({ title: "Title required", variant: "destructive" }); return; }

    try {
      if (editingModule) {
        const { error } = await supabase.from("modules").update({ title: moduleForm.title, description: moduleForm.description }).eq("id", editingModule);
        if (error) throw error;
        toast({ title: "Module updated" });
      } else {
        const nextOrder = modules.length > 0 ? Math.max(...modules.map(m => m.order_number)) + 1 : 1;
        const { error } = await supabase.from("modules").insert([{ course_id: courseId, title: moduleForm.title, description: moduleForm.description, order_number: nextOrder }]);
        if (error) throw error;
        toast({ title: "Module added" });
      }
      setModuleForm({ title: "", description: "" });
      setEditingModule(null);
      setShowModuleForm(false);
      fetchModules();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm("Delete this module and all its chapters?")) return;
    try {
      const { error } = await supabase.from("modules").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Module deleted" });
      fetchModules();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteChapter = async (lessonId: string, moduleId: string) => {
    if (!confirm("Delete this chapter?")) return;
    try {
      const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
      if (error) throw error;
      toast({ title: "Chapter deleted" });
      fetchLessons(moduleId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Add Module Button */}
      {!showModuleForm && (
        <Button onClick={() => { setShowModuleForm(true); setEditingModule(null); setModuleForm({ title: "", description: "" }); }}>
          <Plus className="mr-2 w-4 h-4" /> Add Module
        </Button>
      )}

      {/* Module Form */}
      {showModuleForm && (
        <Card className="gradient-card shadow-medium border-primary/20">
          <CardHeader>
            <CardTitle>{editingModule ? "Edit Module" : "Add Module"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveModule} className="space-y-4">
              <div className="space-y-2">
                <Label>Module Title *</Label>
                <Input value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingModule ? "Update" : "Add"} Module</Button>
                <Button type="button" variant="outline" onClick={() => { setShowModuleForm(false); setEditingModule(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Modules List */}
      {modules.map((mod) => (
        <Card key={mod.id} className="gradient-card shadow-soft border-primary/10">
          <Collapsible open={expandedModules.has(mod.id)} onOpenChange={() => toggleModule(mod.id)}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-primary/5 transition-colors">
                <div className="flex items-center gap-3">
                  {expandedModules.has(mod.id) ? <ChevronDown className="w-5 h-5 text-primary" /> : <ChevronRight className="w-5 h-5 text-primary" />}
                  <Layers className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-lg">{mod.title}</h3>
                    {mod.description && <p className="text-sm text-muted-foreground">{mod.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{lessons[mod.id]?.length || 0} chapters</Badge>
                  <Button variant="ghost" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    setEditingModule(mod.id);
                    setModuleForm({ title: mod.title, description: mod.description });
                    setShowModuleForm(true);
                  }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteModule(mod.id); }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                {/* Chapters in this module */}
                {(lessons[mod.id] || []).map((lesson) => (
                  <div key={lesson.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{lesson.title}</p>
                        {lesson.description && <p className="text-sm text-muted-foreground line-clamp-1">{lesson.description}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingChapter(lesson.id); setAddingChapterToModule(mod.id); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteChapter(lesson.id, mod.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Add/Edit Chapter Form */}
                {addingChapterToModule === mod.id ? (
                  <AdminChapterForm
                    courseId={courseId}
                    moduleId={mod.id}
                    lessonId={editingChapter}
                    existingLessons={lessons[mod.id] || []}
                    onSaved={() => { setAddingChapterToModule(null); setEditingChapter(null); fetchLessons(mod.id); }}
                    onCancel={() => { setAddingChapterToModule(null); setEditingChapter(null); }}
                  />
                ) : (
                  <Button variant="outline" size="sm" onClick={() => { setAddingChapterToModule(mod.id); setEditingChapter(null); }}>
                    <Plus className="mr-2 w-4 h-4" /> Add Chapter
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}

      {modules.length === 0 && !showModuleForm && (
        <Card className="gradient-card border-primary/20">
          <CardContent className="py-12 text-center">
            <Layers className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No modules yet. Add your first module to start building this course.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
