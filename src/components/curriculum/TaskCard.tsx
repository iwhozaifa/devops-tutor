"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  SkipForward,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Eye,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string;
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    xpReward: number;
    hints: string[] | null;
    solution: string | null;
  };
  submission?: {
    id: string;
    status: "ATTEMPTED" | "COMPLETED" | "SKIPPED";
    notes: string | null;
    submittedAt: string | Date;
  } | null;
}

const difficultyConfig = {
  BEGINNER: { label: "Beginner", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  INTERMEDIATE: { label: "Intermediate", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  ADVANCED: { label: "Advanced", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

const statusConfig = {
  COMPLETED: { label: "Completed", icon: CheckCircle2, className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  ATTEMPTED: { label: "Attempted", icon: AlertCircle, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  SKIPPED: { label: "Skipped", icon: SkipForward, className: "bg-muted text-muted-foreground" },
};

function renderDescription(text: string) {
  return text.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <br key={i} />;

    const listMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (listMatch) {
      return (
        <div key={i} className="flex gap-2 pl-2">
          <span className="shrink-0 font-medium text-muted-foreground">{listMatch[1]}.</span>
          <span>{listMatch[2]}</span>
        </div>
      );
    }

    return <p key={i}>{line}</p>;
  });
}

export function TaskCard({ task, submission: initialSubmission }: TaskCardProps) {
  const [submission, setSubmission] = useState(initialSubmission ?? null);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [solutionConfirmed, setSolutionConfirmed] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hints = Array.isArray(task.hints) ? task.hints : [];
  const difficulty = difficultyConfig[task.difficulty];

  async function handleSubmit(status: "COMPLETED" | "ATTEMPTED" | "SKIPPED") {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmission(data.submission);
      }
    } catch {
      // silent fail
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-5 pb-3">
        <div className="space-y-1">
          <h3 className="font-semibold leading-tight">{task.title}</h3>
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", difficulty.className)}>
              {difficulty.label}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3" />
              {task.xpReward} XP
            </span>
          </div>
        </div>
        {submission && (
          <StatusBadge status={submission.status} />
        )}
      </div>

      {/* Description */}
      <div className="space-y-1 px-5 pb-4 text-sm text-muted-foreground">
        {renderDescription(task.description)}
      </div>

      {/* Hints */}
      {hints.length > 0 && (
        <div className="border-t px-5 py-3">
          <button
            onClick={() => setHintsOpen(!hintsOpen)}
            className="flex w-full items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {hintsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Lightbulb className="h-4 w-4" />
            Hints ({hints.length} available)
          </button>
          {hintsOpen && (
            <div className="mt-3 space-y-2">
              {hints.map((hint, i) => (
                <div key={i}>
                  {i < hintsRevealed ? (
                    <div className="rounded-md bg-muted/50 p-3 text-sm">
                      <span className="font-medium">Hint {i + 1}:</span> {hint}
                    </div>
                  ) : i === hintsRevealed ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHintsRevealed(hintsRevealed + 1)}
                    >
                      Show Hint {i + 1}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Solution */}
      {task.solution && (
        <div className="border-t px-5 py-3">
          <button
            onClick={() => setSolutionOpen(!solutionOpen)}
            className="flex w-full items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {solutionOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <Eye className="h-4 w-4" />
            Solution
          </button>
          {solutionOpen && (
            <div className="mt-3">
              {!solutionConfirmed ? (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/30">
                  <p className="text-sm text-yellow-800 dark:text-yellow-400">
                    Are you sure? Try solving it first!
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setSolutionConfirmed(true)}
                  >
                    Reveal Solution
                  </Button>
                </div>
              ) : (
                <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                  {task.solution}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Submission */}
      {!submission ? (
        <div className="border-t p-5 space-y-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional) — describe your approach, questions, or learnings..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleSubmit("COMPLETED")}
              disabled={isSubmitting}
              size="sm"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Mark Complete
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubmit("ATTEMPTED")}
              disabled={isSubmitting}
              size="sm"
            >
              <AlertCircle className="mr-1.5 h-4 w-4" />
              Attempted
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleSubmit("SKIPPED")}
              disabled={isSubmitting}
              size="sm"
            >
              <SkipForward className="mr-1.5 h-4 w-4" />
              Skip
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t px-5 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={submission.status} />
            <span>Submitted</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "ATTEMPTED" | "COMPLETED" | "SKIPPED" }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
