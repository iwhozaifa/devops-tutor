"use client";

import { useState, useCallback, useRef } from "react";
import {
  Flag,
  Send,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { ResultsSummary } from "@/components/quiz/ResultsSummary";
import { ExamTimer } from "./ExamTimer";
import { cn } from "@/lib/utils";

interface ExamOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface ExamQuestionData {
  id: string;
  questionText: string;
  questionType: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  options: ExamOption[];
  explanation?: string | null;
  domain?: string | null;
}

interface ExamData {
  id: string;
  title: string;
  timeLimit: number;
  passingScore: number;
  questionCount: number;
  questions: ExamQuestionData[];
}

interface ExamPlayerProps {
  exam: ExamData;
  subjectSlug: string;
}

interface SubmitResult {
  score: number;
  passed: boolean;
  timeSpent: number;
  results: {
    questionId: string;
    correct: boolean;
    selectedOptionIds: string[];
    correctOptionIds: string[];
    explanation?: string | null;
  }[];
}

export function ExamPlayer({ exam, subjectSlug }: ExamPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const elapsedRef = useRef(0);

  const question = exam.questions[currentIndex];
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k].length > 0
  ).length;

  const handleAnswer = useCallback(
    (selectedIds: string[]) => {
      setAnswers((prev) => ({ ...prev, [question.id]: selectedIds }));
    },
    [question.id]
  );

  function toggleFlag() {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(question.id)) {
        next.delete(question.id);
      } else {
        next.add(question.id);
      }
      return next;
    });
  }

  const handleSubmit = useCallback(async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      const payload = {
        answers: exam.questions.map((q) => ({
          questionId: q.id,
          selectedOptionIds: answers[q.id] ?? [],
        })),
        timeSpent: elapsedRef.current,
      };

      const res = await fetch(`/api/exams/${exam.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Submit failed");

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to submit exam. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [answers, exam.id, exam.questions]);

  const handleTimeUp = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  function handleRetake() {
    setAnswers({});
    setFlagged(new Set());
    setCurrentIndex(0);
    setResult(null);
  }

  if (result) {
    const questionResults = result.results.map((r) => {
      const q = exam.questions.find((qq) => qq.id === r.questionId)!;
      return {
        questionId: r.questionId,
        questionText: q.questionText,
        correct: r.correct,
        selectedOptionIds: r.selectedOptionIds,
        correctOptionIds: r.correctOptionIds,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
        explanation: r.explanation,
      };
    });

    return (
      <ResultsSummary
        score={result.score}
        passed={result.passed}
        passingScore={exam.passingScore}
        results={questionResults}
        onRetake={handleRetake}
        backLink={`/subjects/${subjectSlug}/exams`}
        backLabel="Back to Exams"
        timeSpent={result.timeSpent}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top bar: timer + title */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{exam.title}</h2>
        <ExamTimer
          timeLimitMinutes={exam.timeLimit}
          onTimeUp={handleTimeUp}
          onTick={(elapsed) => {
            elapsedRef.current = elapsed;
          }}
        />
      </div>

      <div className="flex gap-6">
        {/* Sidebar: question navigation */}
        <div className="hidden w-48 shrink-0 md:block">
          <div className="sticky top-8 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              {answeredCount}/{exam.questions.length} answered
            </p>
            <div className="grid grid-cols-5 gap-2">
              {exam.questions.map((q, i) => {
                const isAnswered = answers[q.id] && answers[q.id].length > 0;
                const isFlagged = flagged.has(q.id);
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(i)}
                    className={cn(
                      "relative flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition-colors",
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : isAnswered
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}
                    {isFlagged && (
                      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-yellow-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-primary/20" />
                Answered
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-muted" />
                Unanswered
              </div>
              <div className="flex items-center gap-2">
                <span className="relative h-3 w-3 rounded bg-muted">
                  <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-yellow-500" />
                </span>
                Flagged
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-4">
          {question.domain && (
            <p className="text-xs font-medium text-muted-foreground">
              Domain: {question.domain}
            </p>
          )}

          <QuestionCard
            questionText={question.questionText}
            questionType={question.questionType}
            options={question.options}
            selectedOptionIds={answers[question.id] ?? []}
            onChange={handleAnswer}
            questionNumber={currentIndex + 1}
            totalQuestions={exam.questions.length}
          />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentIndex((i) =>
                    Math.min(exam.questions.length - 1, i + 1)
                  )
                }
                disabled={currentIndex === exam.questions.length - 1}
              >
                Next
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={flagged.has(question.id) ? "secondary" : "outline"}
                size="sm"
                onClick={toggleFlag}
              >
                <Flag className="mr-1 h-4 w-4" />
                {flagged.has(question.id) ? "Flagged" : "Flag"}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit Exam
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <h3 className="text-lg font-semibold">Submit Exam?</h3>
            </div>
            <p className="mb-2 text-sm text-muted-foreground">
              You have answered {answeredCount} of {exam.questions.length}{" "}
              questions.
            </p>
            {flagged.size > 0 && (
              <p className="mb-2 text-sm text-yellow-600">
                {flagged.size} question{flagged.size > 1 ? "s" : ""} flagged for
                review.
              </p>
            )}
            {answeredCount < exam.questions.length && (
              <p className="mb-4 text-sm text-red-600">
                {exam.questions.length - answeredCount} question
                {exam.questions.length - answeredCount > 1 ? "s" : ""}{" "}
                unanswered.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Confirm Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
