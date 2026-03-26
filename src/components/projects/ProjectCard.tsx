import Link from "next/link";
import { Star, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProjectStep {
  stepNumber: number;
  title: string;
  description: string;
  checkpoints: string[];
}

interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    description: string;
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    xpReward: number;
    steps: ProjectStep[];
  };
  progress?: {
    currentStep: number;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  } | null;
  subjectSlug: string;
}

const difficultyConfig = {
  BEGINNER: { label: "Beginner", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  INTERMEDIATE: { label: "Intermediate", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  ADVANCED: { label: "Advanced", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

export function ProjectCard({ project, progress, subjectSlug }: ProjectCardProps) {
  const difficulty = difficultyConfig[project.difficulty];
  const totalSteps = project.steps.length;
  const currentStep = progress?.currentStep ?? 0;
  const status = progress?.status ?? "NOT_STARTED";
  const progressPercent = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  return (
    <div className="rounded-lg border bg-card shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold leading-tight">{project.title}</h3>
          {status === "COMPLETED" && (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", difficulty.className)}>
            {difficulty.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3" />
            {project.xpReward} XP
          </span>
          <span className="text-xs text-muted-foreground">
            {totalSteps} steps
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2">
        {project.description}
      </p>

      {/* Progress bar */}
      {status !== "NOT_STARTED" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{currentStep} / {totalSteps} steps</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                status === "COMPLETED" ? "bg-green-500" : "bg-primary"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Action button */}
      <Button
        variant={status === "COMPLETED" ? "outline" : "default"}
        size="sm"
        className="w-full"
        asChild
      >
        <Link href={`/subjects/${subjectSlug}/projects/${project.id}`}>
          {status === "NOT_STARTED" && (
            <>
              Start Project
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </>
          )}
          {status === "IN_PROGRESS" && (
            <>
              Continue
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </>
          )}
          {status === "COMPLETED" && (
            <>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Completed — View
            </>
          )}
        </Link>
      </Button>
    </div>
  );
}
