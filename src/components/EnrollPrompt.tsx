import { GraduationCap } from "lucide-react";
import { EnrollButton } from "@/components/EnrollButton";

// Shown in place of progress controls when the learner is not enrolled;
// the API rejects progress for unenrolled learners with 403.
export function EnrollPrompt({ subjectId, subjectSlug }: { subjectId: string; subjectSlug: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="font-medium">Enroll in this subject to track your progress</p>
          <p className="text-sm text-muted-foreground">
            You can read everything without enrolling. Enrolling lets you complete days, submit
            quizzes, exams and tasks, and earn XP.
          </p>
        </div>
      </div>
      <EnrollButton subjectId={subjectId} subjectSlug={subjectSlug} stayOnPage />
    </div>
  );
}
