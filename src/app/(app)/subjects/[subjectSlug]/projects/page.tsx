import { notFound } from "next/navigation";
import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProjectCard } from "@/components/projects/ProjectCard";

interface ProjectsPageProps {
  params: Promise<{ subjectSlug: string }>;
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { subjectSlug } = await params;

  const subject = await db.subject.findUnique({
    where: { slug: subjectSlug },
  });

  if (!subject) notFound();

  const session = await auth();
  const userId = session?.user?.id;

  const projects = await db.project.findMany({
    where: { subjectId: subject.id },
    orderBy: { createdAt: "asc" },
  });

  // Fetch user progress for all projects
  let progressMap: Record<string, { currentStep: number; status: string }> = {};
  if (userId && projects.length > 0) {
    const progressRecords = await db.projectProgress.findMany({
      where: {
        userId,
        projectId: { in: projects.map((p) => p.id) },
      },
    });
    for (const p of progressRecords) {
      progressMap[p.projectId] = {
        currentStep: p.currentStep,
        status: p.status,
      };
    }
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/subjects/${subjectSlug}`}
          className="hover:text-foreground"
        >
          {subject.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">Projects</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="mt-1 text-muted-foreground">
          Hands-on projects to apply your {subject.title} knowledge.
        </p>
      </div>

      {/* Project grid */}
      {projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={{
                ...project,
                steps: (project.steps as Array<{
                  stepNumber: number;
                  title: string;
                  description: string;
                  checkpoints: string[];
                }>) || [],
              }}
              progress={
                progressMap[project.id] as {
                  currentStep: number;
                  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
                } | undefined
              }
              subjectSlug={subjectSlug}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 font-semibold">No projects yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Projects for this subject will appear here once they are added.
          </p>
        </div>
      )}
    </div>
  );
}
