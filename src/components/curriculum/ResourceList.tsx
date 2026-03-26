"use client";

import {
  Video,
  FileText,
  GitBranch,
  BookOpen,
  GraduationCap,
  Wrench,
  ExternalLink,
} from "lucide-react";

interface Resource {
  id: string;
  title: string;
  url: string;
  type: "VIDEO" | "ARTICLE" | "REPO" | "DOCS" | "COURSE" | "TOOL";
  source: string | null;
  duration: string | null;
  isRequired: boolean;
}

const typeConfig: Record<
  Resource["type"],
  { icon: typeof Video; label: string }
> = {
  VIDEO: { icon: Video, label: "Video" },
  ARTICLE: { icon: FileText, label: "Article" },
  REPO: { icon: GitBranch, label: "Repo" },
  DOCS: { icon: BookOpen, label: "Docs" },
  COURSE: { icon: GraduationCap, label: "Course" },
  TOOL: { icon: Wrench, label: "Tool" },
};

interface ResourceListProps {
  resources: Resource[];
}

export function ResourceList({ resources }: ResourceListProps) {
  return (
    <div className="space-y-2">
      {resources.map((resource) => {
        const config = typeConfig[resource.type];
        const Icon = config.icon;

        return (
          <a
            key={resource.id}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{resource.title}</span>
                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{config.label}</span>
                {resource.source && (
                  <>
                    <span>·</span>
                    <span>{resource.source}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {resource.duration && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                  {resource.duration}
                </span>
              )}
              {!resource.isRequired && (
                <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                  Optional
                </span>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}
