"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "./QuestionCard";
import { ResultsSummary } from "./ResultsSummary";

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface QuizQuestionData {
  id: string;
  questionText: string;
  questionType: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  options: QuizOption[];
  explanation?: string | null;
}

interface QuizData {
  id: string;
  title: string;
  passingScore: number;
  questions: QuizQuestionData[];
  dayId: string;
}

interface QuizPlayerProps {
  quiz: QuizData;
  subjectSlug: string;
  dayNumber: number;
}

interface SubmitResult {
  score: number;
  passed: boolean;
  results: {
    questionId: string;
    correct: boolean;
    selectedOptionIds: string[];
    correctOptionIds: string[];
    explanation?: string | null;
  }[];
}

export function QuizPlayer({ quiz, subjectSlug, dayNumber }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const question = quiz.questions[currentIndex];
  const allAnswered = quiz.questions.every(
    (q) => answers[q.id] && answers[q.id].length > 0
  );

  const handleAnswer = useCallback(
    (selectedIds: string[]) => {
      setAnswers((prev) => ({ ...prev, [question.id]: selectedIds }));
    },
    [question.id]
  );

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = {
        answers: quiz.questions.map((q) => ({
          questionId: q.id,
          selectedOptionIds: answers[q.id] ?? [],
        })),
      };

      const res = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to submit quiz");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetake() {
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
  }

  if (result) {
    const questionResults = result.results.map((r) => {
      const q = quiz.questions.find((qq) => qq.id === r.questionId)!;
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
        passingScore={quiz.passingScore}
        results={questionResults}
        onRetake={handleRetake}
        backLink={`/subjects/${subjectSlug}/curriculum/${dayNumber}`}
        backLabel="Back to Day"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{
              width: `${
                (Object.keys(answers).length / quiz.questions.length) * 100
              }%`,
            }}
          />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {Object.keys(answers).length}/{quiz.questions.length} answered
        </span>
      </div>

      {/* Question */}
      <QuestionCard
        questionText={question.questionText}
        questionType={question.questionType}
        options={question.options}
        selectedOptionIds={answers[question.id] ?? []}
        onChange={handleAnswer}
        questionNumber={currentIndex + 1}
        totalQuestions={quiz.questions.length}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => i - 1)}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentIndex < quiz.questions.length - 1 ? (
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((i) => i + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : null}

          <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Submit Quiz
          </Button>
        </div>
      </div>

      {/* Question dots */}
      <div className="flex flex-wrap justify-center gap-2">
        {quiz.questions.map((q, i) => {
          const isAnswered = answers[q.id] && answers[q.id].length > 0;
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isAnswered
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
