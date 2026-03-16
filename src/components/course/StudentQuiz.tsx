import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, ArrowRight, Trophy, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question_text: string;
  explanation: string | null;
  order_number: number;
}

interface Option {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_number: number;
}

interface StudentQuizProps {
  quizId: string;
  quizTitle: string;
  userId: string;
  onComplete: () => void;
  onBack: () => void;
}

export const StudentQuiz = ({ quizId, quizTitle, userId, onComplete, onBack }: StudentQuizProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  const fetchQuizData = async () => {
    try {
      const { data: qData } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_number");
      
      setQuestions(qData || []);

      for (const q of qData || []) {
        const { data: opts } = await supabase
          .from("quiz_options")
          .select("*")
          .eq("question_id", q.id)
          .order("order_number");
        setOptions(prev => ({ ...prev, [q.id]: opts || [] }));
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    let correct = 0;
    const answers: any[] = [];

    for (const q of questions) {
      const selectedOptionId = selectedAnswers[q.id];
      const correctOption = options[q.id]?.find(o => o.is_correct);
      const isCorrect = selectedOptionId === correctOption?.id;
      if (isCorrect) correct++;
      answers.push({
        question_id: q.id,
        selected_option_id: selectedOptionId || null,
        is_correct: isCorrect,
      });
    }

    setScore(correct);
    setSubmitted(true);
    setShowResults(true);

    // Save attempt
    try {
      await supabase.from("quiz_attempts").insert({
        user_id: userId,
        quiz_id: quizId,
        score: correct,
        total_questions: questions.length,
        answers: answers,
      });
    } catch (error) {
      console.error("Error saving quiz attempt:", error);
    }
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setShowResults(false);
    setCurrentIndex(0);
    setScore(0);
  };

  if (loading) {
    return (
      <Card className="gradient-card shadow-medium border-primary/20">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading quiz...</p>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="gradient-card shadow-medium border-primary/20">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No questions in this quiz yet.</p>
          <Button onClick={onBack} variant="outline" className="mt-4">Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  // Results screen
  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <Card className="gradient-card shadow-elegant border-primary/20">
        <CardHeader className="text-center pb-2">
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${passed ? 'bg-primary/20' : 'bg-destructive/20'}`}>
            <Trophy className={`w-10 h-10 ${passed ? 'text-primary' : 'text-destructive'}`} />
          </div>
          <CardTitle className="text-3xl">{quizTitle}</CardTitle>
          <p className="text-muted-foreground">Quiz Results</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <div className="text-5xl font-bold text-primary">{percentage}%</div>
            <p className="text-lg text-muted-foreground">{score} of {questions.length} correct</p>
            <Badge className={passed ? "bg-primary/20 text-primary border-primary/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
              {passed ? "Passed!" : "Try Again"}
            </Badge>
          </div>
          <Progress value={percentage} className="h-3" />

          {/* Review answers */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Review Answers</h3>
            {questions.map((q, i) => {
              const selectedId = selectedAnswers[q.id];
              const correctOption = options[q.id]?.find(o => o.is_correct);
              const isCorrect = selectedId === correctOption?.id;

              return (
                <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
                  <div className="flex items-start gap-2 mb-2">
                    {isCorrect ? <CheckCircle className="w-5 h-5 text-primary mt-0.5" /> : <XCircle className="w-5 h-5 text-destructive mt-0.5" />}
                    <p className="font-medium">Q{i + 1}: {q.question_text}</p>
                  </div>
                  {(options[q.id] || []).map(opt => (
                    <div key={opt.id} className={`text-sm pl-7 py-1 ${
                      opt.is_correct ? 'text-primary font-medium' : opt.id === selectedId && !opt.is_correct ? 'text-destructive line-through' : 'text-muted-foreground'
                    }`}>
                      {opt.is_correct ? "✓" : opt.id === selectedId ? "✗" : "○"} {opt.option_text}
                    </div>
                  ))}
                  {q.explanation && <p className="text-sm text-muted-foreground italic pl-7 mt-2">💡 {q.explanation}</p>}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 justify-center">
            <Button onClick={handleRetry} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" /> Retry Quiz
            </Button>
            <Button onClick={onComplete} className="shadow-glow">
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Quiz taking screen
  const currentQ = questions[currentIndex];
  const currentOpts = options[currentQ.id] || [];
  const allAnswered = questions.every(q => selectedAnswers[q.id]);

  return (
    <Card className="gradient-card shadow-elegant border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-2xl">{quizTitle}</CardTitle>
          <Badge variant="secondary">Question {currentIndex + 1} of {questions.length}</Badge>
        </div>
        <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-lg font-medium">{currentQ.question_text}</p>

        <div className="space-y-3">
          {currentOpts.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelectAnswer(currentQ.id, opt.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedAnswers[currentQ.id] === opt.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <span className="text-sm">{opt.option_text}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-primary' : selectedAnswers[questions[i].id] ? 'bg-primary/40' : 'bg-border'
                }`}
              />
            ))}
          </div>
          {currentIndex < questions.length - 1 ? (
            <Button onClick={() => setCurrentIndex(currentIndex + 1)}>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!allAnswered} className="shadow-glow">
              Submit Quiz
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
