"use client";

import { CheckCircle, XCircle, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuestionResult {
  questionId: string;
  questionText: string;
  correct: boolean;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  options: { id: string; text: string }[];
  explanation?: string | null;
}

interface ResultsSummaryProps {
  score: number;
  passed: boolean;
  passingScore: number;
  results: QuestionResult[];
  onRetake: () => void;
  backLink: string;
  backLabel: string;
  /** Extra info like time spent */
  timeSpent?: number;
}

export function ResultsSummary({
  score,
  passed,
  passingScore,
  results,
  onRetake,
  backLink,
  backLabel,
  timeSpent,
}: ResultsSummaryProps) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  return (
    <div className="space-y-8">
      {/* Score card */}
      <div className="flex flex-col items-center rounded-lg border bg-card p-8 shadow-sm">
        {/* Circular progress */}
        <div className="relative mb-4 h-36 w-36">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={cn(
                "transition-all duration-1000",
                passed ? "stroke-green-500" : "stroke-red-500"
              )}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{score}%</span>
          </div>
        </div>

        {/* Pass / Fail */}
        <div
          className={cn(
            "mb-2 flex items-center gap-2 text-lg font-semibold",
            passed ? "text-green-600" : "text-red-600"
          )}
        >
          {passed ? (
            <>
              <CheckCircle className="h-5 w-5" />
              Passed
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5" />
              Failed
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Passing score: {passingScore}%
        </p>
        {timeSpent !== undefined && (
          <p className="mt-1 text-sm text-muted-foreground">
            Time spent: {formatTime(timeSpent)}
          </p>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={onRetake}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Retake
          </Button>
          <Button asChild>
            <Link href={backLink}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        </div>
      </div>

      {/* Question review */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Review Answers</h3>
        {results.map((result, index) => {
          const optionMap = new Map(
            result.options.map((o) => [o.id, o.text])
          );

          return (
            <div
              key={result.questionId}
              className="rounded-lg border bg-card p-5 shadow-sm"
            >
              <div className="mb-3 flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                    result.correct ? "bg-green-500" : "bg-red-500"
                  )}
                >
                  {index + 1}
                </span>
                <p className="font-medium">{result.questionText}</p>
              </div>

              {/* User's answer */}
              <div className="ml-9 space-y-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Your answer:
                  </p>
                  <div className="mt-1 space-y-1">
                    {result.selectedOptionIds.map((id) => (
                      <p
                        key={id}
                        className={cn(
                          "rounded px-2 py-1 text-sm",
                          result.correctOptionIds.includes(id)
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        )}
                      >
                        {optionMap.get(id) ?? id}
                      </p>
                    ))}
                    {result.selectedOptionIds.length === 0 && (
                      <p className="text-sm italic text-muted-foreground">
                        No answer selected
                      </p>
                    )}
                  </div>
                </div>

                {/* Correct answer (if wrong) */}
                {!result.correct && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Correct answer:
                    </p>
                    <div className="mt-1 space-y-1">
                      {result.correctOptionIds.map((id) => (
                        <p
                          key={id}
                          className="rounded bg-green-50 px-2 py-1 text-sm text-green-700"
                        >
                          {optionMap.get(id) ?? id}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {result.explanation && (
                  <div className="mt-2 rounded bg-blue-50 p-3 text-sm text-blue-800">
                    <span className="font-medium">Explanation: </span>
                    {result.explanation}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
