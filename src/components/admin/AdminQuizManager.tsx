import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Module { id: string; title: string; order_number: number; }
interface Lesson { id: string; title: string; module_id: string | null; order_number: number; }
interface Quiz { id: string; title: string; quiz_type: string; lesson_id: string | null; module_id: string | null; }
interface Question { id: string; question_text: string; explanation: string | null; order_number: number; }
interface Option { id: string; option_text: string; is_correct: boolean; order_number: number; }

interface AdminQuizManagerProps { courseId: string; }

export const AdminQuizManager = ({ courseId }: AdminQuizManagerProps) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizForm, setQuizForm] = useState({ title: "", quiz_type: "chapter", lesson_id: "", module_id: "" });
  const [editingQuiz, setEditingQuiz] = useState<string | null>(null);
  // Question form
  const [showQuestionForm, setShowQuestionForm] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState({ question_text: "", explanation: "" });
  const [optionsForm, setOptionsForm] = useState([{ option_text: "", is_correct: false }, { option_text: "", is_correct: false }, { option_text: "", is_correct: false }, { option_text: "", is_correct: false }]);
  const { toast } = useToast();

  useEffect(() => { fetchAll(); }, [courseId]);

  const fetchAll = async () => {
    const [modsRes, lessonsRes, quizzesRes] = await Promise.all([
      supabase.from("modules").select("*").eq("course_id", courseId).order("order_number"),
      supabase.from("lessons").select("*").eq("course_id", courseId).order("order_number"),
      supabase.from("quizzes").select("*").or(`module_id.in.(${(await supabase.from("modules").select("id").eq("course_id", courseId)).data?.map(m => m.id).join(",") || ""}),lesson_id.in.(${(await supabase.from("lessons").select("id").eq("course_id", courseId)).data?.map(l => l.id).join(",") || ""})`),
    ]);
    setModules(modsRes.data || []);
    setLessons(lessonsRes.data || []);
    setQuizzes(quizzesRes.data || []);
  };

  const fetchQuestions = async (quizId: string) => {
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("order_number");
    setQuestions(prev => ({ ...prev, [quizId]: data || [] }));
    for (const q of data || []) {
      const { data: opts } = await supabase.from("quiz_options").select("*").eq("question_id", q.id).order("order_number");
      setOptions(prev => ({ ...prev, [q.id]: opts || [] }));
    }
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizForm.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    
    try {
      const payload: any = {
        title: quizForm.title,
        quiz_type: quizForm.quiz_type,
        lesson_id: quizForm.quiz_type === "chapter" && quizForm.lesson_id ? quizForm.lesson_id : null,
        module_id: quizForm.quiz_type === "module" && quizForm.module_id ? quizForm.module_id : null,
      };

      if (editingQuiz) {
        const { error } = await supabase.from("quizzes").update(payload).eq("id", editingQuiz);
        if (error) throw error;
        toast({ title: "Quiz updated" });
      } else {
        const { error } = await supabase.from("quizzes").insert([payload]);
        if (error) throw error;
        toast({ title: "Quiz created" });
      }
      setShowQuizForm(false);
      setEditingQuiz(null);
      setQuizForm({ title: "", quiz_type: "chapter", lesson_id: "", module_id: "" });
      fetchAll();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm("Delete this quiz and all its questions?")) return;
    try {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Quiz deleted" });
      fetchAll();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSaveQuestion = async (quizId: string) => {
    if (!questionForm.question_text) { toast({ title: "Question text required", variant: "destructive" }); return; }
    const validOptions = optionsForm.filter(o => o.option_text.trim());
    if (validOptions.length < 2) { toast({ title: "At least 2 options required", variant: "destructive" }); return; }
    if (!validOptions.some(o => o.is_correct)) { toast({ title: "Mark at least one correct answer", variant: "destructive" }); return; }

    try {
      const nextOrder = (questions[quizId]?.length || 0) + 1;
      const { data: qData, error: qError } = await supabase.from("quiz_questions").insert([{
        quiz_id: quizId,
        question_text: questionForm.question_text,
        explanation: questionForm.explanation || null,
        order_number: nextOrder,
      }]).select().single();
      if (qError) throw qError;

      const optionsPayload = validOptions.map((o, i) => ({
        question_id: qData.id,
        option_text: o.option_text,
        is_correct: o.is_correct,
        order_number: i + 1,
      }));
      const { error: oError } = await supabase.from("quiz_options").insert(optionsPayload);
      if (oError) throw oError;

      toast({ title: "Question added" });
      setShowQuestionForm(null);
      setQuestionForm({ question_text: "", explanation: "" });
      setOptionsForm([{ option_text: "", is_correct: false }, { option_text: "", is_correct: false }, { option_text: "", is_correct: false }, { option_text: "", is_correct: false }]);
      fetchQuestions(quizId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteQuestion = async (questionId: string, quizId: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId);
      if (error) throw error;
      toast({ title: "Question deleted" });
      fetchQuestions(quizId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getQuizTarget = (quiz: Quiz) => {
    if (quiz.quiz_type === "chapter") {
      const lesson = lessons.find(l => l.id === quiz.lesson_id);
      return lesson ? `Chapter: ${lesson.title}` : "Unlinked";
    }
    const mod = modules.find(m => m.id === quiz.module_id);
    return mod ? `Module: ${mod.title}` : "Unlinked";
  };

  return (
    <div className="space-y-6">
      {!showQuizForm && (
        <Button onClick={() => { setShowQuizForm(true); setEditingQuiz(null); setQuizForm({ title: "", quiz_type: "chapter", lesson_id: "", module_id: "" }); }}>
          <Plus className="mr-2 w-4 h-4" /> Add Quiz
        </Button>
      )}

      {showQuizForm && (
        <Card className="gradient-card shadow-medium border-primary/20">
          <CardHeader><CardTitle>{editingQuiz ? "Edit Quiz" : "Add Quiz"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSaveQuiz} className="space-y-4">
              <div className="space-y-2">
                <Label>Quiz Title *</Label>
                <Input value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Quiz Type</Label>
                <Select value={quizForm.quiz_type} onValueChange={(v) => setQuizForm({ ...quizForm, quiz_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chapter">After Chapter</SelectItem>
                    <SelectItem value="module">End of Module</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {quizForm.quiz_type === "chapter" && (
                <div className="space-y-2">
                  <Label>Attach to Chapter</Label>
                  <Select value={quizForm.lesson_id} onValueChange={(v) => setQuizForm({ ...quizForm, lesson_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select chapter" /></SelectTrigger>
                    <SelectContent>
                      {lessons.map(l => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {quizForm.quiz_type === "module" && (
                <div className="space-y-2">
                  <Label>Attach to Module</Label>
                  <Select value={quizForm.module_id} onValueChange={(v) => setQuizForm({ ...quizForm, module_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                    <SelectContent>
                      {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit">{editingQuiz ? "Update" : "Create"} Quiz</Button>
                <Button type="button" variant="outline" onClick={() => { setShowQuizForm(false); setEditingQuiz(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {quizzes.map((quiz) => (
        <Card key={quiz.id} className="gradient-card shadow-soft border-primary/10">
          <Collapsible open={expandedQuiz === quiz.id} onOpenChange={() => {
            if (expandedQuiz !== quiz.id) { setExpandedQuiz(quiz.id); fetchQuestions(quiz.id); }
            else setExpandedQuiz(null);
          }}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-primary/5">
                <div className="flex items-center gap-3">
                  {expandedQuiz === quiz.id ? <ChevronDown className="w-5 h-5 text-primary" /> : <ChevronRight className="w-5 h-5 text-primary" />}
                  <HelpCircle className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">{quiz.title}</h3>
                    <p className="text-sm text-muted-foreground">{getQuizTarget(quiz)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{quiz.quiz_type}</Badge>
                  <Button variant="ghost" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    setEditingQuiz(quiz.id);
                    setQuizForm({ title: quiz.title, quiz_type: quiz.quiz_type, lesson_id: quiz.lesson_id || "", module_id: quiz.module_id || "" });
                    setShowQuizForm(true);
                  }}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(quiz.id); }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                {(questions[quiz.id] || []).map((q, qi) => (
                  <div key={q.id} className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="font-medium">Q{qi + 1}: {q.question_text}</p>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(q.id, quiz.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    {(options[q.id] || []).map((opt) => (
                      <div key={opt.id} className={`text-sm pl-4 flex items-center gap-2 ${opt.is_correct ? "text-primary font-medium" : "text-muted-foreground"}`}>
                        {opt.is_correct ? "✓" : "○"} {opt.option_text}
                      </div>
                    ))}
                    {q.explanation && <p className="text-sm text-muted-foreground italic pl-4">💡 {q.explanation}</p>}
                  </div>
                ))}

                {showQuestionForm === quiz.id ? (
                  <Card className="border-primary/20">
                    <CardContent className="pt-4 space-y-3">
                      <div className="space-y-1">
                        <Label>Question *</Label>
                        <Textarea value={questionForm.question_text} onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })} rows={2} />
                      </div>
                      <div className="space-y-2">
                        <Label>Options (mark correct answer)</Label>
                        {optionsForm.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Checkbox checked={opt.is_correct} onCheckedChange={(checked) => {
                              const newOpts = [...optionsForm];
                              newOpts[i].is_correct = !!checked;
                              setOptionsForm(newOpts);
                            }} />
                            <Input placeholder={`Option ${i + 1}`} value={opt.option_text} onChange={(e) => {
                              const newOpts = [...optionsForm];
                              newOpts[i].option_text = e.target.value;
                              setOptionsForm(newOpts);
                            }} />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <Label>Explanation (optional)</Label>
                        <Input value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveQuestion(quiz.id)}>Add Question</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowQuestionForm(null)}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowQuestionForm(quiz.id)}>
                    <Plus className="mr-2 w-4 h-4" /> Add Question
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}

      {quizzes.length === 0 && !showQuizForm && (
        <Card className="gradient-card border-primary/20">
          <CardContent className="py-12 text-center">
            <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No quizzes yet. Add quizzes to test student understanding.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
