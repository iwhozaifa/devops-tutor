"use client";

import { cn } from "@/lib/utils";

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface QuestionCardProps {
  questionText: string;
  questionType: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  options: QuestionOption[];
  selectedOptionIds: string[];
  onChange: (selectedIds: string[]) => void;
  questionNumber: number;
  totalQuestions: number;
}

export function QuestionCard({
  questionText,
  questionType,
  options,
  selectedOptionIds,
  onChange,
  questionNumber,
  totalQuestions,
}: QuestionCardProps) {
  const isSingleAnswer =
    questionType === "SINGLE_CHOICE" || questionType === "TRUE_FALSE";

  function handleSelect(optionId: string) {
    if (isSingleAnswer) {
      onChange([optionId]);
    } else {
      if (selectedOptionIds.includes(optionId)) {
        onChange(selectedOptionIds.filter((id) => id !== optionId));
      } else {
        onChange([...selectedOptionIds, optionId]);
      }
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        Question {questionNumber} of {totalQuestions}
      </p>
      <h3 className="mb-6 text-lg font-semibold leading-snug">
        {questionText}
      </h3>

      {questionType === "MULTIPLE_CHOICE" && (
        <p className="mb-3 text-xs text-muted-foreground">
          Select all that apply
        </p>
      )}

      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id);
          return (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50",
                isSelected && "border-primary bg-primary/5"
              )}
            >
              {isSingleAnswer ? (
                <input
                  type="radio"
                  name={`question-${questionNumber}`}
                  checked={isSelected}
                  onChange={() => handleSelect(option.id)}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
              ) : (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSelect(option.id)}
                  className="h-4 w-4 shrink-0 rounded accent-primary"
                />
              )}
              <span className="text-sm">{option.text}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
