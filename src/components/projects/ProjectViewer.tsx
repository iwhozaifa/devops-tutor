"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Star,
  Square,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProjectStep {
  stepNumber: number;
  title: string;
  description: string;
  checkpoints: string[];
}

interface ProjectViewerProps {
  project: {
    id: string;
    title: string;
    xpReward: number;
    steps: ProjectStep[];
    repoUrl?: string | null;
  };
  progress?: {
    currentStep: number;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  } | null;
}

function renderDescription(text: string) {
  return text.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <br key={i} />;
    return <p key={i}>{line}</p>;
  });
}

export function ProjectViewer({ project, progress: initialProgress }: ProjectViewerProps) {
  const steps = project.steps;
  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    const step = initialProgress?.currentStep ?? 0;
    return Math.min(step, steps.length - 1);
  });
  const [completedSteps, setCompletedSteps] = useState(() => {
    return initialProgress?.currentStep ?? 0;
  });
  const [projectComplete, setProjectComplete] = useState(
    initialProgress?.status === "COMPLETED"
  );
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = steps[currentStepIndex];
  const isStepCompleted = currentStepIndex < completedSteps;
  const isCurrentStepNext = currentStepIndex === completedSteps;

  function toggleCheckpoint(stepIndex: number, checkpointIndex: number) {
    const key = `${stepIndex}-${checkpointIndex}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleCompleteStep() {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepCompleted: currentStepIndex }),
      });
      const data = await res.json();
      if (data.success) {
        const newCompleted = Math.max(completedSteps, currentStepIndex + 1);
        setCompletedSteps(newCompleted);
        if (data.projectComplete) {
          setProjectComplete(true);
        } else if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(currentStepIndex + 1);
        }
      }
    } catch {
      // silent fail
    } finally {
      setIsSubmitting(false);
    }
  }

  if (projectComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/30">
          <Trophy className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold">Project Complete!</h2>
        <p className="text-muted-foreground max-w-md">
          Congratulations! You have completed all {steps.length} steps of this project.
        </p>
        <div className="flex items-center gap-1 text-lg font-semibold text-primary">
          <Star className="h-5 w-5" />
          {project.xpReward} XP Earned
        </div>
        {project.repoUrl && (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline hover:no-underline"
          >
            View Repository
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Left sidebar — step list */}
      <div className="hidden w-64 shrink-0 md:block">
        <nav className="space-y-1">
          {steps.map((step, i) => {
            const completed = i < completedSteps;
            const active = i === currentStepIndex;
            return (
              <button
                key={i}
                onClick={() => setCurrentStepIndex(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {completed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <Circle className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                )}
                <span className="truncate">
                  {step.stepNumber}. {step.title}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main area */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Step header */}
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Step {currentStep.stepNumber} of {steps.length}
          </p>
          <h2 className="mt-1 text-xl font-bold">{currentStep.title}</h2>
          {isStepCompleted && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </span>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1 text-sm text-muted-foreground leading-relaxed">
          {renderDescription(currentStep.description)}
        </div>

        {/* Checkpoints */}
        {currentStep.checkpoints.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Checkpoints</h3>
            <div className="space-y-2">
              {currentStep.checkpoints.map((checkpoint, i) => {
                const key = `${currentStepIndex}-${i}`;
                const checked = isStepCompleted || checkedItems[key];
                return (
                  <button
                    key={i}
                    onClick={() => !isStepCompleted && toggleCheckpoint(currentStepIndex, i)}
                    className="flex w-full items-start gap-3 rounded-md p-2 text-left text-sm hover:bg-muted/50 transition-colors"
                    disabled={isStepCompleted}
                  >
                    {checked ? (
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Square className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={cn(checked && "text-muted-foreground line-through")}>
                      {checkpoint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Complete Step button */}
        {isCurrentStepNext && !isStepCompleted && (
          <Button
            onClick={handleCompleteStep}
            disabled={isSubmitting}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Complete Step"}
          </Button>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous Step
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
            disabled={currentStepIndex === steps.length - 1}
          >
            Next Step
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
