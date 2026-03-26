import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProjectViewer } from "@/components/projects/ProjectViewer";

interface ProjectPageProps {
  params: Promise<{ subjectSlug: string; projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { subjectSlug, projectId } = await params;

  const subject = await db.subject.findUnique({
    where: { slug: subjectSlug },
  });

  if (!subject) notFound();

  const project = await db.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.subjectId !== subject.id) notFound();

  const session = await auth();
  const userId = session?.user?.id;

  let progress = null;
  if (userId) {
    progress = await db.projectProgress.findUnique({
      where: {
        userId_projectId: { userId, projectId },
      },
    });
  }

  const steps = (project.steps as Array<{
    stepNumber: number;
    title: string;
    description: string;
    checkpoints: string[];
  }>) || [];

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
        <Link
          href={`/subjects/${subjectSlug}/projects`}
          className="hover:text-foreground"
        >
          Projects
        </Link>
        <span>/</span>
        <span className="text-foreground">{project.title}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{project.title}</h1>
        <p className="mt-2 text-muted-foreground">{project.description}</p>
      </div>

      {/* Project viewer */}
      <ProjectViewer
        project={{
          id: project.id,
          title: project.title,
          xpReward: project.xpReward,
          steps,
          repoUrl: project.repoUrl,
        }}
        progress={
          progress
            ? {
                currentStep: progress.currentStep,
                status: progress.status as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED",
              }
            : null
        }
      />
    </div>
  );
}
