"use client";

import { cn } from "@/lib/utils";
import {
  Award,
  Flame,
  BookOpen,
  CheckCircle,
  FileText,
  FolderGit2,
  Star,
} from "lucide-react";
import { useState } from "react";

interface BadgeData {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  earned: boolean;
  earnedAt?: string | null;
}

interface BadgeDisplayProps {
  badges: BadgeData[];
  className?: string;
}

const iconMap: Record<string, React.ElementType> = {
  flame: Flame,
  "book-open": BookOpen,
  "check-circle": CheckCircle,
  "file-text": FileText,
  "folder-git-2": FolderGit2,
  star: Star,
  award: Award,
};

function BadgeIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = iconMap[icon] ?? Award;
  return <Icon className={className} />;
}

export function BadgeDisplay({ badges, className }: BadgeDisplayProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className={cn("grid grid-cols-5 gap-3 sm:grid-cols-6 md:grid-cols-8", className)}>
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="relative flex flex-col items-center"
          onMouseEnter={() => setHoveredId(badge.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all",
              badge.earned
                ? "border-yellow-500 bg-yellow-500/10 text-yellow-500 shadow-sm"
                : "border-muted bg-muted/30 text-muted-foreground/40"
            )}
          >
            <BadgeIcon icon={badge.icon} className="h-5 w-5" />
          </div>

          {/* Tooltip */}
          {hoveredId === badge.id && (
            <div className="absolute -top-2 left-1/2 z-50 w-48 -translate-x-1/2 -translate-y-full rounded-lg border bg-popover p-3 text-popover-foreground shadow-md">
              <p className="text-xs font-semibold">{badge.title}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {badge.description}
              </p>
              {badge.earned && badge.earnedAt && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Earned {new Date(badge.earnedAt).toLocaleDateString()}
                </p>
              )}
              <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 border-b border-r bg-popover" />
            </div>
          )}

          <span
            className={cn(
              "mt-1 line-clamp-1 text-center text-[10px]",
              badge.earned ? "text-foreground" : "text-muted-foreground/50"
            )}
          >
            {badge.title}
          </span>
        </div>
      ))}
    </div>
  );
}
